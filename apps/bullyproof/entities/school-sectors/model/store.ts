import { create } from "zustand";
import type { schoolSectors } from "@/server/db/schema";

type SchoolSector = typeof schoolSectors.$inferSelect;

type SchoolSectorsState = {
  schoolSectors: SchoolSector[];
  setSchoolSectors: (schoolSectors: SchoolSector[]) => void;
  clearSchoolSectors: () => void;
};

export const useSchoolSectorsStore = create<SchoolSectorsState>((set) => ({
  schoolSectors: [],
  setSchoolSectors: (schoolSectors) => set({ schoolSectors }),
  clearSchoolSectors: () => set({ schoolSectors: [] }),
}));
