"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map/team art */
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Moon,
  Plus,
  Sun,
  Wand2,
  X,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

import { createBrowserClient } from "@/utils/supabase/client";

import type { ScrimMap, Tier } from "../types";
import { tierColor } from "../lib/helpers";
import {
  createListing,
  fetchTeamListings,
  type TimeslotItem,
} from "../lib/client";
import { hourInZone, zonedDayHours } from "../lib/tz";
import { useScrimData } from "./scrim-data-provider";
import { ScrimDayCard, type HourSlot } from "./scrim-day-card";

const DEFAULT_TZ = "Australia/Sydney";

export function ScrimHome() {
  const { selectedTeam, tiers, maps, regions } = useScrimData();

  const timeZone = useMemo(() => {
    const region = regions.find((r) => r.id === selectedTeam?.regionId);
    return region?.timezone ?? DEFAULT_TZ;
  }, [regions, selectedTeam?.regionId]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [isPM, setIsPM] = useState(true);
  const [proMode, setProMode] = useState(true);
  const [bookingMode, setBookingMode] = useState(false);
  const [selectedMaps, setSelectedMaps] = useState<ScrimMap[]>([]);
  const [minTier, setMinTier] = useState<Tier | null>(null);
  const [proposed, setProposed] = useState<Set<number>>(new Set());
  const [items, setItems] = useState<TimeslotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Default min tier to the lowest (everyone welcome).
  useEffect(() => {
    if (!minTier && tiers.length > 0) setMinTier(tiers[tiers.length - 1] ?? null);
  }, [tiers, minTier]);

  // Reset selection on date change.
  useEffect(() => {
    setProposed(new Set());
  }, [selectedDate]);

  const teamId = selectedTeam?.id ?? null;

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    const grouped = await fetchTeamListings(teamId, selectedDate);
    setItems(Object.values(grouped).flat());
    setLoading(false);
  }, [teamId, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live updates.
  useEffect(() => {
    if (!teamId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`scrim-home:${teamId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scrim_listings" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scrims" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, load]);

  const hours = useMemo<HourSlot[]>(() => {
    const now = Date.now();
    const instants = zonedDayHours(selectedDate, timeZone);
    return instants.map((instant) => {
      const match = items.find((it) => {
        const t = it.type === "scrim" ? it.match_time : it.timeslot;
        return new Date(t).getTime() === instant.getTime();
      });
      let type: HourSlot["type"] = instant.getTime() < now ? "closed" : "open";
      if (match) type = instant.getTime() < now ? "closed" : "pending";
      return { instant, type, item: match ?? null };
    });
  }, [items, selectedDate, timeZone]);

  const visibleHours = useMemo(() => {
    return hours.filter((h) => {
      const hod = hourInZone(h.instant, timeZone);
      if (proMode) {
        return isPM ? hod >= 14 && hod <= 22 : hod >= 8 && hod <= 11;
      }
      return isPM ? hod >= 12 : hod < 12;
    });
  }, [hours, proMode, isPM, timeZone]);

  const toggleSlot = (slot: HourSlot) => {
    if (!bookingMode) setBookingMode(true);
    setProposed((prev) => {
      const next = new Set(prev);
      const key = slot.instant.getTime();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const exitBooking = () => {
    setBookingMode(false);
    setProposed(new Set());
  };

  const submit = async () => {
    if (!teamId || proposed.size === 0 || selectedMaps.length === 0) return;
    setSaving(true);
    for (const ms of proposed) {
      await createListing({
        teamId,
        minTierId: minTier?.id ?? null,
        regionId: selectedTeam?.regionId ?? null,
        timeslot: new Date(ms).toISOString(),
        mapIds: selectedMaps.map((m) => m.id),
      });
    }
    setSaving(false);
    exitBooking();
    await load();
  };

  const toggleMap = (map: ScrimMap, checked: boolean) => {
    setSelectedMaps((prev) =>
      checked ? [...prev, map] : prev.filter((m) => m.id !== map.id),
    );
  };

  const canSubmit = proposed.size > 0 && selectedMaps.length > 0 && !saving;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {/* Date + view controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            aria-label="Previous day"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            aria-label="Next day"
          >
            <ChevronRight className="size-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="gap-2 text-xl font-bold">
                <CalendarDays className="size-5" />
                {format(selectedDate, "EEEE, MMMM do")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                autoFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Mode controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={proMode ? "default" : "outline"}
                size="sm"
                onClick={() => setProMode((p) => !p)}
              >
                Pro Hours
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limit to typical practice hours</TooltipContent>
          </Tooltip>
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={!isPM ? "secondary" : "ghost"}
              size="sm"
              className="gap-1"
              onClick={() => setIsPM(false)}
            >
              <Sun className="size-4" /> AM
            </Button>
            <Button
              variant={isPM ? "secondary" : "ghost"}
              size="sm"
              className="gap-1"
              onClick={() => setIsPM(true)}
            >
              <Moon className="size-4" /> PM
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {bookingMode ? (
            <div className="flex items-center gap-2 animate-slide-right-fade-in">
              {/* Maps multiselect */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      selectedMaps.length === 0 &&
                        "border-orange-500 text-orange-400",
                    )}
                  >
                    {selectedMaps.length > 0
                      ? `Maps (${selectedMaps.length})`
                      : "Choose Maps"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="flex flex-col gap-1">
                    {maps.map((map) => {
                      const checked = selectedMaps.some((m) => m.id === map.id);
                      return (
                        <label
                          key={map.id}
                          className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                        >
                          <span className="flex items-center gap-2">
                            {map.badge ? (
                              <img
                                src={map.badge}
                                alt=""
                                className="h-4 w-auto object-contain"
                              />
                            ) : null}
                            <span className="text-xs font-medium">{map.name}</span>
                          </span>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(c) => toggleMap(map, Boolean(c))}
                          />
                        </label>
                      );
                    })}
                    <div className="mt-1 flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedMaps(maps)}
                      >
                        All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedMaps([])}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Min tier */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: tierColor(minTier) ?? "#888" }}
                    />
                    {minTier?.name ?? "Tier"} +
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-1" align="end">
                  {tiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setMinTier(tier)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: tierColor(tier) ?? "#888" }}
                      />
                      {tier.name} +
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              <Button
                size="sm"
                className={cn("gap-1", canSubmit && "animate-pulse")}
                disabled={!canSubmit}
                onClick={submit}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Wand2 className="size-4" />
                )}
                Create Listings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-red-400 hover:text-red-300"
                onClick={exitBooking}
              >
                <X className="size-4" /> Exit
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="gap-1 animate-slide-right-fade-in"
              onClick={() => setBookingMode(true)}
            >
              <Plus className="size-4" /> Enter Booking Mode
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : visibleHours.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No slots in this window. Toggle AM/PM or Pro Hours.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleHours.map((slot, i) => (
            <ScrimDayCard
              key={slot.instant.getTime()}
              slot={slot}
              index={i}
              timeZone={timeZone}
              bookingMode={bookingMode}
              selected={proposed.has(slot.instant.getTime())}
              selectedMaps={selectedMaps}
              maps={maps}
              selectedTeamId={teamId ?? ""}
              onToggle={toggleSlot}
            />
          ))}
        </div>
      )}

      {bookingMode && selectedMaps.length === 0 ? (
        <p className="text-center text-xs text-orange-400">
          Choose at least one map to create listings.
        </p>
      ) : null}
    </div>
  );
}
