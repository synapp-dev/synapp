import { create } from "zustand";
import type { schoolLevels } from "@/server/db/schema";

type SchoolLevel = typeof schoolLevels.$inferSelect;

type SchoolLevelsState = {
  schoolLevels: SchoolLevel[];
  setSchoolLevels: (schoolLevels: SchoolLevel[]) => void;
  clearSchoolLevels: () => void;
};

export const useSchoolLevelsStore = create<SchoolLevelsState>((set) => ({
  schoolLevels: [],
  setSchoolLevels: (schoolLevels) => set({ schoolLevels }),
  clearSchoolLevels: () => set({ schoolLevels: [] }),
}));
