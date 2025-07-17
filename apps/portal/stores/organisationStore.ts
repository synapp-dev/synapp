import { create } from "zustand";
import type { Organisation } from "@/providers/postgres/organisations/read";

type OrganisationStore = {
  organisations: Organisation[];
  setOrganisations: (orgs: Organisation[]) => void;
  selectedOrganisation: Organisation | null;
  setSelectedOrganisation: (org: Organisation | null) => void;
};

export const useOrganisationStore = create<OrganisationStore>((set) => ({
  organisations: [],
  setOrganisations: (orgs) => set({ organisations: orgs }),
  selectedOrganisation: null,
  setSelectedOrganisation: (org) => set({ selectedOrganisation: org }),
}));
