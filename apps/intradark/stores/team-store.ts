import { create } from "zustand";

export interface Team {
  id: string;
  name: string;
  slug: string;
}

interface TeamState {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  clearCurrentTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  setCurrentTeam: (team) => set({ currentTeam: team }),
  clearCurrentTeam: () => set({ currentTeam: null }),
}));
