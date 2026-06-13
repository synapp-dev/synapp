"use client";

import CountUp from "react-countup";

import { FaceitLevelBadge } from "@/components/atoms/faceit-level-badge";
import { useGetFaceitProfile } from "@/entities/players/hooks/queries";
import { usePlayerStore } from "@/entities/players";
import type { FaceitProfile } from "@/entities/players/lib/types";

type FaceitGame = NonNullable<FaceitProfile["payload"]["games"]["cs2"]>;

function pickFaceitGame(
  profile: FaceitProfile | undefined,
): FaceitGame | undefined {
  const cs2 = profile?.payload?.games?.cs2;
  const csgo = profile?.payload?.games?.csgo;
  if (cs2?.faceit_elo != null || cs2?.skill_level != null) return cs2;
  if (csgo?.faceit_elo != null || csgo?.skill_level != null) return csgo;
  return undefined;
}

export function FaceitElo({
  steamid64: steamid64Prop,
  /** Seconds before the count-up begins (e.g. wait for a parent fade-in). */
  delay = 0,
}: {
  steamid64?: string;
  delay?: number;
} = {}) {
  const { selectedPlayer } = usePlayerStore();
  const steamid64 = steamid64Prop ?? selectedPlayer?.steamId64 ?? "";
  const { data, isLoading } = useGetFaceitProfile(steamid64 || undefined);
  const game = pickFaceitGame(data);
  const elo = game?.faceit_elo;
  const level = game?.skill_level;

  if (!steamid64) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5" aria-busy aria-label="Loading FACEIT rating">
        <span className="inline-block size-5 animate-pulse rounded-full bg-white/10" />
        <span className="inline-block h-4 w-12 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  if (elo == null) return null;

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1.5">
          {level != null ? <FaceitLevelBadge level={level} size="xs" /> : null}
          <p className="animate-slide-up-fade-in-slow pb-0.5 font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.95),0_2px_10px_rgba(0,0,0,0.75)]">
            <CountUp
              end={elo}
              duration={2}
              delay={delay}
              separator=","
            />
          </p>
        </div>
      </div>
    </div>
  );
}
