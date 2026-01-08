import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import type {
  curriculumStages,
  schoolYears,
  schoolLevels,
} from "@/server/db/schema";

type Stage = typeof curriculumStages.$inferSelect & {
  years?: Array<{
    id: string;
    code: string;
    displayName: string;
    sortIndex: number;
    level: {
      id: string;
      name: string;
      key: string;
    };
  }>;
};

type StageWithYears = Stage;

interface StagesState {
  // Normalized cache: stageId -> Stage
  stages: Record<string, StageWithYears>;
  // List of stage IDs (for maintaining order)
  stageIds: string[];

  // Actions
  setStages: (stages: StageWithYears[]) => void;
  setStage: (stage: StageWithYears) => void;
  removeStage: (stageId: string) => void;
  clearStages: () => void;
}

export const useStagesStore = create<StagesState>((set) => ({
  stages: {},
  stageIds: [],

  setStages: (stages) =>
    set({
      stages: stages.reduce(
        (acc, stage) => {
          acc[stage.id] = stage;
          return acc;
        },
        {} as Record<string, StageWithYears>
      ),
      stageIds: stages.map((s) => s.id),
    }),

  setStage: (stage) =>
    set((state) => {
      const newStages = { ...state.stages, [stage.id]: stage };
      const newStageIds = state.stageIds.includes(stage.id)
        ? state.stageIds
        : [...state.stageIds, stage.id];
      return { stages: newStages, stageIds: newStageIds };
    }),

  removeStage: (stageId) =>
    set((state) => {
      const { [stageId]: removed, ...stages } = state.stages;
      return {
        stages,
        stageIds: state.stageIds.filter((id) => id !== stageId),
      };
    }),

  clearStages: () => set({ stages: {}, stageIds: [] }),
}));

// React Query hooks for stages
export function useStages() {
  const queryClient = useQueryClient();
  const { stages, stageIds, setStages } = useStagesStore();

  const query = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const result = await curriculumApi.stages.list({ limit: 100 });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stages");
      }
      if (result.data) {
        // Update Zustand store with normalized data
        setStages(result.data);
        return result.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    // Use initialData from Zustand if available for immediate display
    initialData: () => {
      const zustandStages = stageIds.map((id) => stages[id]).filter(Boolean);
      return zustandStages.length > 0 ? zustandStages : undefined;
    },
  });

  // Use React Query's cached data (which includes initialData) for immediate display
  // This ensures cached data is shown instantly without waiting for Zustand sync
  return {
    ...query,
    stages: query.data || [],
  };
}

export function useStage(stageId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { stages, setStage } = useStagesStore();

  const query = useQuery({
    queryKey: ["stages", stageId],
    queryFn: async () => {
      if (!stageId) return null;

      const result = await curriculumApi.stages.byId(stageId);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stage");
      }
      if (result.data) {
        // Update Zustand store
        setStage(result.data);
        return result.data;
      }
      return null;
    },
    enabled: !!stageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use React Query's cached data directly for immediate display
  // Fallback to Zustand store if React Query doesn't have data yet
  const cachedStage = query.data || (stageId ? stages[stageId] : null);

  return {
    ...query,
    stage: cachedStage,
  };
}

export function useStageByCode(stageCode: string | null | undefined) {
  const queryClient = useQueryClient();
  const { stages, setStage } = useStagesStore();

  const query = useQuery({
    queryKey: ["stages", "by-code", stageCode],
    queryFn: async () => {
      if (!stageCode) return null;

      const result = await curriculumApi.stages.byCode(stageCode);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stage");
      }
      if (result.data) {
        // Update Zustand store
        setStage(result.data);
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
    ? Object.values(stages).find((s) => s.code === stageCode) || null
    : null);

  return {
    ...query,
    stage: cachedStage,
  };
}

// Helper function to invalidate stage cache
export function useInvalidateStage() {
  const queryClient = useQueryClient();

  return {
    invalidateStage: (stageId: string) => {
      queryClient.invalidateQueries({ queryKey: ["stages", stageId] });
      queryClient.invalidateQueries({ queryKey: ["stages", "by-code"] });
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
    invalidateAllStages: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  };
}
