"use client";

import { cn } from "@workspace/ui/lib/utils";
import { Card } from "@workspace/ui/components/card";
import {
  type GcBadges,
  useGcBadges,
} from "@/entities/players/hooks/use-gc-badges";
import {
  CoinShowcase,
  medalDefindexes,
} from "@/entities/players/components/coin-showcase";

export interface PlayerSummaryCardProps {
  steamid64: string;
  className?: string;
  /** When provided, skips an internal badges fetch (parent owns the query). */
  badges?: GcBadges | null;
}

/** Card showing the player's in-game coins in a single row. */
export function PlayerSummaryCard({
  steamid64,
  className,
  badges: badgesOverride,
}: PlayerSummaryCardProps) {
  const internal = useGcBadges(badgesOverride !== undefined ? null : steamid64);
  const badges = badgesOverride ?? internal.badges;
  const coinDefindexes = medalDefindexes(badges?.medals);

  return (
    <Card
      className={cn("flex items-center border-none py-2", className)}
    >
      {coinDefindexes.length > 0 ? (
        <CoinShowcase
          defindexes={coinDefindexes}
          paginated={5}
          className="w-full"
        />
      ) : null}
    </Card>
  );
}
