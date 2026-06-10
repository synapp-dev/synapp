"use client";

import { Medal } from "lucide-react";

import { Badge } from "@workspace/ui/components/badge";
import { useGcBadges } from "@/entities/players/hooks/use-gc-badges";
import { medalDefindexes } from "@/entities/players/components/coin-showcase";
import { PanelCard, Stat } from "@/entities/players/components/panel-card";

export function BadgesPanel({ steamid64 }: { steamid64: string }) {
  const { badges, pending, error } = useGcBadges(steamid64);
  const coinDefindexes = medalDefindexes(badges?.medals);

  const action = pending ? (
    <Badge variant="secondary" className="animate-pulse">
      Loading…
    </Badge>
  ) : badges ? (
    <Badge variant="secondary">Live</Badge>
  ) : null;

  return (
    <PanelCard
      title="In-game badges"
      icon={<Medal className="size-4 text-muted-foreground" aria-hidden />}
      action={action}
      unavailable={
        !badges
          ? pending
            ? "Fetching in-game badges from the Game Coordinator…"
            : error
              ? "Badges not available right now"
              : "No in-game badge data"
          : null
      }
    >
      {badges ? (
        <div>
          {typeof badges.player_level === "number" ? (
            <Stat label="CS rank (level)" value={badges.player_level} />
          ) : null}
          <Stat label="Medals / coins" value={coinDefindexes.length} />
          <Stat label="Friendly" value={badges.cmd_friendly ?? "—"} />
          <Stat label="Teaching" value={badges.cmd_teaching ?? "—"} />
          <Stat label="Leader" value={badges.cmd_leader ?? "—"} />
          {badges.vac_banned ? (
            <Badge variant="destructive" className="mt-2">
              VAC banned
            </Badge>
          ) : null}
        </div>
      ) : null}
    </PanelCard>
  );
}
