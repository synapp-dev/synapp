import { create } from "zustand";
import { persist } from "zustand/middleware";

type AppContextState = {
  preferredSchoolId: string | null;
  onboardingCompleted: boolean;
  setPreferredSchoolId: (schoolId: string | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  resetContext: () => void;
};

export const useAppContextStore = create<AppContextState>()(
  persist(
    (set) => ({
      preferredSchoolId: null,
      onboardingCompleted: false,
      setPreferredSchoolId: (preferredSchoolId) => set({ preferredSchoolId }),
      setOnboardingCompleted: (onboardingCompleted) =>
        set({ onboardingCompleted }),
      resetContext: () =>
        set({
          preferredSchoolId: null,
          onboardingCompleted: false,
        }),
    }),
    {
      name: "supersolt-app-context",
      partialize: (state) => ({
        preferredSchoolId: state.preferredSchoolId,
        onboardingCompleted: state.onboardingCompleted,
      }),
    }
  )
);
