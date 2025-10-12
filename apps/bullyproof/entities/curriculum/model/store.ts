import { create } from "zustand";
import type { curriculumStages, schoolYears, schoolLevels } from "@/server/db/schema";

type Stage = typeof curriculumStages.$inferSelect;
type Year = typeof schoolYears.$inferSelect;
type Level = typeof schoolLevels.$inferSelect;

type CurriculumState = {
  stages: Stage[];
  years: Year[];
  levels: Level[];
  setStages: (stages: Stage[]) => void;
  setYears: (years: Year[]) => void;
  setLevels: (levels: Level[]) => void;
  clearAll: () => void;
};

export const useCurriculumStore = create<CurriculumState>((set) => ({
  stages: [],
  years: [],
  levels: [],
  setStages: (stages) => set({ stages }),
  setYears: (years) => set({ years }),
  setLevels: (levels) => set({ levels }),
  clearAll: () => set({ stages: [], years: [], levels: [] }),
}));
