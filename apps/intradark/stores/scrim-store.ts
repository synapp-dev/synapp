import { create } from "zustand";

/** Which of the viewer's teams they are currently acting as in the scrim UI. */
interface ScrimState {
  selectedTeamId: string | null;
  setSelectedTeamId: (id: string | null) => void;
}

export const useScrimStore = create<ScrimState>((set) => ({
  selectedTeamId: null,
  setSelectedTeamId: (id) => set({ selectedTeamId: id }),
}));
