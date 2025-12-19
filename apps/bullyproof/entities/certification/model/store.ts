import { create } from "zustand";
import type { certificationStages } from "@/server/db/schema";

type Stage = typeof certificationStages.$inferSelect & {
  topicCount?: number;
};

type CertificationState = {
  stages: Stage[];
  setStages: (stages: Stage[]) => void;
  clearAll: () => void;
};

export const useCertificationStore = create<CertificationState>((set) => ({
  stages: [],
  setStages: (stages) => set({ stages }),
  clearAll: () => set({ stages: [] }),
}));
