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

export function useCertificationStageByCode(stageCode: string | null | undefined) {
  const queryClient = useQueryClient();
  const { stages, setStages } = useCertificationStore();

  const query = useQuery({
    queryKey: ["certification", "stages", "by-code", stageCode],
    queryFn: async () => {
      if (!stageCode) return null;

      const result = await certificationApi.stages.byCode(stageCode);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification stage");
      }
      if (result.data) {
        // Update Zustand store - add to stages array if not already present
        setStages([...stages.filter(s => s.id !== result.data!.id), result.data]);
        return result.data;
      }
      return null;
    },
    enabled: !!stageCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use React Query's cached data directly for immediate display
  // Fallback to Zustand store if React Query doesn't have data yet
  const cachedStage = query.data || (stageCode
    ? stages.find((s) => s.code === stageCode) || null
    : null);

  return {
    ...query,
    stage: cachedStage,
  };
}

// Hook for invalidating certification stage cache
export function useInvalidateCertificationStage() {
  const queryClient = useQueryClient();

  const invalidateAllStages = () => {
    queryClient.invalidateQueries({ queryKey: ["certification", "stages"] });
  };

  const invalidateStage = (stageId: string) => {
    queryClient.invalidateQueries({ queryKey: ["certification", "stages"] });
    queryClient.invalidateQueries({ queryKey: ["certification", "stages", stageId] });
  };

  const invalidateStageByCode = (code: string) => {
    queryClient.invalidateQueries({ queryKey: ["certification", "stages"] });
    queryClient.invalidateQueries({ queryKey: ["certification", "stages", "by-code", code] });
  };

  return {
    invalidateAllStages,
    invalidateStage,
    invalidateStageByCode,
  };
}
