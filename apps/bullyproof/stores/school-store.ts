import { create } from "zustand";
import { persist } from "zustand/middleware";

interface School {
  id: string;
  name: string;
  slug: string;
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  sector?: string | null;
  levels?: string[] | null;
  state?: string | null;
}

interface SchoolStoreState {
  currentSchool: School | null;
  lastAccessedSchool: School | null; // For maintaining state when navigating to dashboard
  setCurrentSchool: (school: School | null) => void;
  setLastAccessedSchool: (school: School | null) => void;
  clearCurrentSchool: () => void;
  clearLastAccessedSchool: () => void;
  // Helper to get the appropriate school based on context
  getActiveSchool: () => School | null;
}

export const useSchoolStore = create<SchoolStoreState>()(
  persist(
    (set, get) => ({
      currentSchool: null,
      lastAccessedSchool: null,
      setCurrentSchool: (school) => {
        set({ currentSchool: school });
        // Also update last accessed school when setting current school
        if (school) {
          set({ lastAccessedSchool: school });
        }
      },
      setLastAccessedSchool: (school) => set({ lastAccessedSchool: school }),
      clearCurrentSchool: () => set({ currentSchool: null }),
      clearLastAccessedSchool: () => set({ lastAccessedSchool: null }),
      getActiveSchool: () => {
        const state = get();
        // If we have a current school (from URL), use it
        // Otherwise, fall back to the last accessed school
        return state.currentSchool || state.lastAccessedSchool;
      },
    }),
    {
      name: "school-store",
      // Only persist the lastAccessedSchool, not the currentSchool (which should come from URL)
      partialize: (state) => ({ lastAccessedSchool: state.lastAccessedSchool }),
      // Skip hydration during SSR to prevent React 19 compatibility issues
      skipHydration: true,
    }
  )
);
