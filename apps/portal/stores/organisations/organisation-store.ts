import { create } from "zustand";
import React from "react";
import type { Organisation } from "@/providers/postgres/organisations/read";
import { useDatabaseEndpoint } from "@/utils/api-client";

type OrganisationStore = {
  organisations: Organisation[];
  isLoading: boolean;
  error: string | null;
  setOrganisations: (orgs: Organisation[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectedOrganisation: Organisation | null;
  setSelectedOrganisation: (org: Organisation | null) => void;
  // Auto-fetch method that components can call
  fetchOrganisations: () => Promise<void>;
};

export const useOrganisationStore = create<OrganisationStore>((set, get) => ({
  organisations: [],
  isLoading: false,
  error: null,
  setOrganisations: (orgs) => set({ organisations: orgs }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  selectedOrganisation: null,
  setSelectedOrganisation: (org) => set({ selectedOrganisation: org }),

  // Auto-fetch method that triggers the query using the new API client
  fetchOrganisations: async () => {
    const { setLoading, setError, setOrganisations } = get();

    // Don't fetch if already loading
    if (get().isLoading) return;

    setLoading(true);
    setError(null);

    try {
      // We'll need to pass the API client from the component
      // This will be handled in the useOrganisations hook
      const response = await fetch("/api/organisations", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch organisations");
      }

      const result = await response.json();

      if (result.success) {
        setOrganisations(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch organisations");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  },
}));

// Hook that automatically fetches data when the store is accessed
export function useOrganisations() {
  const store = useOrganisationStore();
  const apiClient = useDatabaseEndpoint();

  // Auto-fetch on first access
  React.useEffect(() => {
    if (store.organisations.length === 0 && !store.isLoading) {
      const fetchData = async () => {
        store.setLoading(true);
        store.setError(null);

        try {
          const result = await apiClient.organisations();

          if (result.success) {
            store.setOrganisations(result.data);
          } else {
            throw new Error(result.error || "Failed to fetch organisations");
          }
        } catch (error) {
          store.setError(
            error instanceof Error ? error.message : "Unknown error"
          );
        } finally {
          store.setLoading(false);
        }
      };

      fetchData();
    }
  }, [store, apiClient]);

  return store;
}
