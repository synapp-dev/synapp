import { create } from "zustand";

// UI-only flag so any surface (dashboard chip, "Review now") can summon the
// check-in wizard mounted once in the main layout.

type CheckinUiState = {
  open: boolean;
  openWizard: () => void;
  closeWizard: () => void;
};

export const useCheckinStore = create<CheckinUiState>((set) => ({
  open: false,
  openWizard: () => set({ open: true }),
  closeWizard: () => set({ open: false }),
}));
