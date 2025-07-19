import { create } from "zustand";

import type { Organisation } from "@/providers/postgres/organisations/read";
import { 
  useGetAllOrganisations, 
  useGetOrganisationById,
  useGetOrganisationBySlug
} from "@/hooks/organisations/queries/read";
import { useEffect } from "react";

type OrganisationStore = {
  selectedOrganisation: Organisation | null;
  setSelectedOrganisation: (org: Organisation | null) => void;
};

export const useOrganisationStore = create<OrganisationStore>((set) => ({
  selectedOrganisation: null,
  setSelectedOrganisation: (org) => set({ selectedOrganisation: org }),
}));

// Hook that uses React Query for data fetching and Zustand for local state
export function useOrganisations() {
  const { selectedOrganisation, setSelectedOrganisation } = useOrganisationStore();
  const queryResult = useGetAllOrganisations();

  return {
    // React Query data and states
    organisations: queryResult.data?.data || [],
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
    
    // Zustand local state
    selectedOrganisation,
    setSelectedOrganisation,
  };
}

// New explicit hooks for ID and slug
export function useOrganisationById(id: string) {
  const { selectedOrganisation, setSelectedOrganisation } = useOrganisationStore(); 
  const queryResult = useGetOrganisationById(id);

  // Auto-set as selected organisation when data loads
  useEffect(() => {
    if (queryResult.data?.success && queryResult.data.data) {
      setSelectedOrganisation(queryResult.data.data);
    }
  }, [queryResult.data, setSelectedOrganisation]);

  return {
    // React Query data and states
    organisation: queryResult.data?.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
    
    // Zustand local state
    selectedOrganisation,
    setSelectedOrganisation,
  };
}

export function useOrganisationBySlug(slug: string) {
  const { selectedOrganisation, setSelectedOrganisation } = useOrganisationStore();
  const queryResult = useGetOrganisationBySlug(slug);

  // Auto-set as selected organisation when data loads
  useEffect(() => {
    if (queryResult.data?.success && queryResult.data.data) {
      setSelectedOrganisation(queryResult.data.data);
    }
  }, [queryResult.data, setSelectedOrganisation]);

  return {
    // React Query data and states
    organisation: queryResult.data?.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error?.message || null,
    isError: queryResult.isError,
    refetch: queryResult.refetch,
    
    // Zustand local state
    selectedOrganisation,
    setSelectedOrganisation,
  };
}
