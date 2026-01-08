import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { certificationApi } from "@/entities/certification/api/endpoints";
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

// React Query hooks for certification stages
export function useCertificationStages() {
  const queryClient = useQueryClient();
  const { stages, setStages } = useCertificationStore();

  const query = useQuery({
    queryKey: ["certification", "stages"],
    queryFn: async () => {
      const result = await certificationApi.stages.list({ limit: 100 });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification stages");
      }
      if (result.data) {
        // Sort by sortIndex to ensure correct order
        const sorted = [...result.data].sort(
          (a, b) => a.sortIndex - b.sortIndex
        );
        // Update Zustand store
        setStages(sorted);
        return sorted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    // Use initialData from Zustand if available for immediate display
    initialData: () => {
      return stages.length > 0 ? stages : undefined;
    },
  });

  // Use React Query's cached data (which includes initialData) for immediate display
  // This ensures cached data is shown instantly without waiting for Zustand sync
  return {
    ...query,
    stages: query.data || [],
  };
}
