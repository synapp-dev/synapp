"use client";

import type { TeamSummary } from "@/entities/teams/types";
import { TeamQuickSwitcher } from "@/entities/teams/components/team-quick-switcher";

export function TeamsWorkspaceShell({
  myTeams,
  children,
}: {
  myTeams: TeamSummary[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {myTeams.length > 1 ? (
        <TeamQuickSwitcher teams={myTeams} />
      ) : null}
      {children}
    </div>
  );
}
