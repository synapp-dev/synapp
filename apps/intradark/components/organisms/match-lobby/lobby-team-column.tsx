import type { LobbyTeamMock } from "@/lib/match-lobby-mock-data";

import { LobbyPlayerCard } from "./lobby-player-card";

type LobbyTeamColumnProps = {
  team: LobbyTeamMock;
  side: "north" | "south";
  serverPhaseOverride?: boolean;
};

export function LobbyTeamColumn({
  team,
  side,
  serverPhaseOverride,
}: LobbyTeamColumnProps) {
  return (
    <div className="flex min-h-0 min-w-0 w-full flex-col gap-3">
      <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
        {team.name}
      </h2>
      <div className="flex flex-col gap-2">
        {team.players.map((p) => (
          <LobbyPlayerCard
            key={p.id}
            player={p}
            side={side}
            serverPhaseOverride={serverPhaseOverride}
          />
        ))}
      </div>
    </div>
  );
}
