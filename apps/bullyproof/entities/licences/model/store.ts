import { create } from "zustand";
import type { schoolLicences } from "@/server/db/schema";

type Licence = typeof schoolLicences.$inferSelect;

type LicencesState = {
  licences: Licence[];
  setLicences: (licences: Licence[]) => void;
  addLicence: (licence: Licence) => void;
  updateLicence: (id: string, licence: Partial<Licence>) => void;
  removeLicence: (id: string) => void;
  clearLicences: () => void;
};

export const useLicencesStore = create<LicencesState>((set) => ({
  licences: [],
  setLicences: (licences) => set({ licences }),
  addLicence: (licence) =>
    set((state) => ({
      licences: [...state.licences, licence],
    })),
  updateLicence: (id, licence) =>
    set((state) => ({
      licences: state.licences.map((l) => (l.id === id ? { ...l, ...licence } : l)),
    })),
  removeLicence: (id) =>
    set((state) => ({
      licences: state.licences.filter((l) => l.id !== id),
    })),
  clearLicences: () => set({ licences: [] }),
}));
