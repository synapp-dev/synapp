import {
  MOCK_TEAM_NORTH,
  MOCK_TEAM_SOUTH,
} from "../lib/mock-data";

import { LobbyTeamColumn } from "./lobby-team-column";
import { LobbyVetoColumnFooter } from "./lobby-veto-column-footer";
import { MatchLobbyMockProvider } from "./match-lobby-mock-context";
import { MatchLobbyPhaseNav } from "./match-lobby-phase-nav";
import { MatchVetoMockProvider } from "./match-veto-mock-context";

type MatchLobbyLayoutProps = {
  matchId: string;
  children: React.ReactNode;
};

export function MatchLobbyLayout({ matchId, children }: MatchLobbyLayoutProps) {
  return (
    <div className="space-y-4 text-zinc-100">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        CSGO Lobby #{matchId}
      </p>

      <MatchLobbyMockProvider>
        <MatchVetoMockProvider>
          <div className="grid min-h-[480px] grid-cols-1 gap-12 lg:grid-cols-3 lg:items-start">
            <div className="flex min-h-0 min-w-0 flex-col">
              <LobbyTeamColumn team={MOCK_TEAM_NORTH} side="north" />
              <LobbyVetoColumnFooter side="north" />
            </div>

            <div className="flex min-w-0 min-h-0 w-full flex-col rounded-xl bg-zinc-950/40 p-4">
              <MatchLobbyPhaseNav matchId={matchId} />
              {children}
            </div>

            <div className="flex min-h-0 min-w-0 flex-col">
              <LobbyTeamColumn team={MOCK_TEAM_SOUTH} side="south" />
              <LobbyVetoColumnFooter side="south" />
            </div>
          </div>
        </MatchVetoMockProvider>
      </MatchLobbyMockProvider>
    </div>
  );
}
