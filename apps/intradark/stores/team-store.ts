import { create } from "zustand";

import type { TeamSummary } from "@/entities/teams/types";

interface TeamState {
  currentTeam: TeamSummary | null;
  setCurrentTeam: (team: TeamSummary | null) => void;
  clearCurrentTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  setCurrentTeam: (team) => set({ currentTeam: team }),
  clearCurrentTeam: () => set({ currentTeam: null }),
}));

export type { TeamSummary as Team };
