"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map art */
import { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, subDays } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Loader2,
  ShieldCheck,
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
import { isTierWorthy, tierColor, tierRank } from "../lib/helpers";
import {
  fetchAllListings,
  type ChallengeItem,
  type ListingItem,
  type TimeslotItem,
} from "../lib/client";
import { useScrimData } from "./scrim-data-provider";
import { ScrimListingRow } from "./scrim-listing-row";
import { ScrimScrimRow } from "./scrim-scrim-row";
import { ScrimChallengeDialog } from "./scrim-challenge-dialog";
import { ScrimAcceptDialog } from "./scrim-accept-dialog";

export function ScrimListings() {
  const { selectedTeam, tiers, maps } = useScrimData();
  const teamId = selectedTeam?.id ?? null;

  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [accessibleOnly, setAccessibleOnly] = useState(true);
  const [mapFilters, setMapFilters] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState<Tier | null>(null);
  const [grouped, setGrouped] = useState<Record<string, TimeslotItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [challengeTarget, setChallengeTarget] = useState<ListingItem | null>(null);
  const [acceptTarget, setAcceptTarget] = useState<{
    challenge: ChallengeItem;
    listing: ListingItem;
  } | null>(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setGrouped(await fetchAllListings(teamId, selectedDate));
    setLoading(false);
  }, [teamId, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!teamId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`scrim-listings:${teamId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scrim_listings" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scrim_challenges" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [teamId, load]);

  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const mapFilterPass = useCallback(
    (listing: ListingItem) => {
      if (mapFilters.length === 0) return true;
      return (listing.scrim_listing_maps ?? []).some((m) =>
        mapFilters.includes(m.map_id),
      );
    },
    [mapFilters],
  );

  const sections = useMemo(() => {
    if (!teamId) return [];
    return Object.keys(grouped)
      .filter((ts) => {
        const d = new Date(ts);
        return d >= dayStart && d <= dayEnd;
      })
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((ts) => {
        const kept = grouped[ts]!.filter((item) => {
          if (item.type === "scrim") {
            return item.home_team_id === teamId || item.away_team_id === teamId;
          }
          const mine = item.team_id === teamId;
          if (mine) return mapFilterPass(item);
          const worthy = isTierWorthy(tiers, selectedTeam?.tierId, item.min_tier_id);
          if (accessibleOnly && !worthy) return false;
          if (!mapFilterPass(item)) return false;
          if (tierFilter) {
            const posterRank = tierRank(tiers, item.team?.tier_id);
            const filterRank = tierFilter.rank;
            if (posterRank != null && posterRank > filterRank) return false;
          }
          return true;
        });
        // Own listings first.
        kept.sort((a, b) => {
          const am = a.type === "listing" && a.team_id === teamId ? -1 : 0;
          const bm = b.type === "listing" && b.team_id === teamId ? -1 : 0;
          return am - bm;
        });
        return { ts, items: kept };
      })
      .filter((s) => s.items.length > 0);
  }, [
    grouped,
    teamId,
    tiers,
    selectedTeam?.tierId,
    accessibleOnly,
    tierFilter,
    mapFilterPass,
    dayStart,
    dayEnd,
  ]);

  if (!selectedTeam) return null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {/* Date */}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={accessibleOnly ? "default" : "outline"}
              size="sm"
              className="gap-1"
              onClick={() => setAccessibleOnly((a) => !a)}
            >
              <ShieldCheck className="size-4" /> Accessible
            </Button>
          </TooltipTrigger>
          <TooltipContent>Only show listings my team can challenge</TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(mapFilters.length > 0 && "border-orange-400 text-orange-300")}
            >
              <Crosshair className="mr-1 size-4" />
              Maps {mapFilters.length > 0 ? `(${mapFilters.length})` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="flex flex-col gap-1">
              {maps.map((map) => {
                const checked = mapFilters.includes(map.id);
                return (
                  <label
                    key={map.id}
                    className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent"
                  >
                    <span className="flex items-center gap-2">
                      {map.badge ? (
                        <img src={map.badge} alt="" className="h-4 w-auto object-contain" />
                      ) : null}
                      <span className="text-xs font-medium">{map.name}</span>
                    </span>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) =>
                        setMapFilters((prev) =>
                          c ? [...prev, map.id] : prev.filter((x) => x !== map.id),
                        )
                      }
                    />
                  </label>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => setMapFilters([])}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {tierFilter ? (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tierColor(tierFilter) ?? "#888" }}
                />
              ) : null}
              {tierFilter ? `${tierFilter.name} +` : "Tier Filter"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-44 p-1" align="start">
            <button
              onClick={() => setTierFilter(null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium hover:bg-accent"
            >
              Any tier
            </button>
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setTierFilter(tier)}
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
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : sections.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No listings for this day. Try another date or relax the filters.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.map(({ ts, items }, si) => (
            <div
              key={ts}
              className="overflow-hidden rounded-lg border animate-slide-down-fade-in"
              style={{ animationDelay: `${Math.min(si, 10) * 40}ms` }}
            >
              <div className="flex items-center gap-3 border-b bg-card px-4 py-3">
                <span className="text-lg font-bold">
                  {format(new Date(ts), "h:mm a")}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {format(new Date(ts), "dd MMMM")}
                </span>
              </div>
              <div className="divide-y">
                {items.map((item) =>
                  item.type === "listing" ? (
                    <ScrimListingRow
                      key={item.id}
                      listing={item}
                      myTeam={selectedTeam}
                      tiers={tiers}
                      maps={maps}
                      onChallenge={setChallengeTarget}
                      onAccept={(challenge, listing) =>
                        setAcceptTarget({ challenge, listing })
                      }
                      onChanged={load}
                    />
                  ) : (
                    <ScrimScrimRow key={item.id} scrim={item} maps={maps} />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {challengeTarget ? (
        <ScrimChallengeDialog
          listing={challengeTarget}
          myTeam={selectedTeam}
          maps={maps}
          onClose={() => setChallengeTarget(null)}
          onSubmitted={load}
        />
      ) : null}

      {acceptTarget ? (
        <ScrimAcceptDialog
          challenge={acceptTarget.challenge}
          listing={acceptTarget.listing}
          maps={maps}
          onClose={() => setAcceptTarget(null)}
          onAccepted={() => {
            setAcceptTarget(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
