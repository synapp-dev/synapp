"use client";

/* eslint-disable @next/next/no-img-element -- remote CDN map/team art */
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

import type { ScrimMap, Tier } from "../types";
import { FALLBACK_TEAM_AVATAR, mapById, tierById, tierStar } from "../lib/helpers";
import type { TimeslotItem } from "../lib/client";
import { formatInZone } from "../lib/tz";

export type HourSlot = {
  instant: Date;
  type: "open" | "closed" | "pending";
  item: TimeslotItem | null;
};

export function ScrimDayCard({
  slot,
  timeZone,
  bookingMode,
  selected,
  selectedMaps,
  maps,
  tiers,
  minTier,
  selectedTeamId,
  index = 0,
  onToggle,
}: {
  slot: HourSlot;
  timeZone: string;
  bookingMode: boolean;
  selected: boolean;
  selectedMaps: ScrimMap[];
  maps: ScrimMap[];
  tiers: Tier[];
  minTier: Tier | null;
  selectedTeamId: string;
  index?: number;
  onToggle: (slot: HourSlot) => void;
}) {
  const router = useRouter();
  const time = formatInZone(slot.instant, timeZone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const item = slot.item;
  const isScrim = item?.type === "scrim";
  const isListing = item?.type === "listing";

  const scrimMap =
    isScrim && item.map_id ? mapById(maps, item.map_id) : null;
  const opponent =
    isScrim && item
      ? item.home_team_id === selectedTeamId
        ? item.away_team
        : item.home_team
      : null;
  const listingMapIds = isListing ? item.scrim_listing_maps?.map((m) => m.map_id) ?? [] : [];

  // Tier emblem: opponent's tier for a scrim, the listing's min tier for a
  // listing, or the tier you're about to list at while booking.
  const slotTier = isScrim
    ? tierById(tiers, opponent?.tier_id)
    : isListing
      ? tierById(tiers, item.min_tier_id)
      : selected && bookingMode
        ? minTier
        : null;
  const tierIcon = tierStar(slotTier);
  const tierEmblem = tierIcon ? (
    <img
      src={tierIcon}
      alt={slotTier?.name ?? ""}
      title={slotTier?.name ?? ""}
      style={{ animationDuration: "8s" }}
      className="size-5 shrink-0 animate-spin-slow object-contain"
    />
  ) : null;

  const handleClick = () => {
    if (slot.type === "closed") return;
    if (isScrim && item) {
      router.push(`/scrims/match/${item.id}`);
      return;
    }
    if (slot.type === "open") onToggle(slot);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={slot.type === "closed"}
      style={{
        animationDelay: `${Math.min(index, 12) * 25}ms`,
        ...(scrimMap?.screenshot
          ? { backgroundImage: `url(${scrimMap.screenshot})` }
          : {}),
      }}
      className={cn(
        "relative flex h-full min-h-28 flex-col justify-between overflow-hidden rounded-lg border bg-cover bg-center p-3 text-left transition-all animate-slide-down-fade-in hover:scale-[1.015]",
        slot.type === "closed" && "cursor-not-allowed border-border/40 opacity-50",
        slot.type === "open" && "border-border hover:border-foreground/40",
        isListing && "border-orange-500/70 bg-orange-500/5",
        isScrim && "border-white/60",
        selected && bookingMode && "border-blue-500 bg-blue-500/10",
      )}
    >
      {/* Top-down fade: map art stays visible up top, content sits over solid bg below. */}
      <span className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-b from-background/45 to-black" />

      <div className="relative z-10 flex items-start justify-between">
        <span className="text-xs font-bold text-muted-foreground">{time}</span>
        {scrimMap?.badge ? (
          <img
            src={scrimMap.badge}
            alt=""
            className="h-[3.75rem] w-auto object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.65)]"
          />
        ) : null}
      </div>

      <div className="relative z-10 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {isScrim ? (
            <div className="flex items-center gap-2">
              <img
                src={opponent?.avatar || FALLBACK_TEAM_AVATAR}
                alt=""
                className="size-6 shrink-0 object-contain"
              />
              <span className="truncate text-2xl font-black">
                {opponent?.name ?? "Opponent"}
              </span>
              {tierEmblem}
            </div>
          ) : isListing ? (
            <div className="flex items-center gap-2">
              <Swords className="size-6 text-orange-400" />
              <span className="text-2xl font-black">Listed</span>
              {tierEmblem}
            </div>
          ) : selected && bookingMode ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-300">Selected</span>
              {tierEmblem}
            </div>
          ) : slot.type === "open" ? (
            <span className="text-xs text-muted-foreground">Open</span>
          ) : null}
          {isScrim && scrimMap ? (
            <p className="text-xs text-muted-foreground">on {scrimMap.name}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-1">
          {(isListing ? listingMapIds : selected && bookingMode ? selectedMaps.map((m) => m.id) : [])
            .map((id) => mapById(maps, id))
            .filter((m): m is ScrimMap => Boolean(m?.badge))
            .slice(0, 7)
            .map((m) => (
              <img
                key={m.id}
                src={m.badge!}
                alt={m.name}
                title={m.name}
                className="h-4 w-auto object-contain"
              />
            ))}
        </div>
      </div>
    </button>
  );
}
