import { useQuery, useQueryClient } from "@tanstack/react-query";
import { curriculumApi } from "@/entities/curriculum/api/endpoints";
import type {
  curriculumStages,
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

// React Query hooks for stages
export function useStages() {
  const query = useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const result = await curriculumApi.stages.list({ limit: 100 });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stages");
      }
      if (result.data) {
        return result.data;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    stages: query.data || [],
  };
}

export function useStage(stageId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["stages", stageId],
    queryFn: async () => {
      if (!stageId) return null;

      const result = await curriculumApi.stages.byId(stageId);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stage");
      }
      if (result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!stageId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    stage: query.data || null,
  };
}

export function useStageByCode(stageCode: string | null | undefined) {
  const query = useQuery({
    queryKey: ["stages", "by-code", stageCode],
    queryFn: async () => {
      if (!stageCode) return null;

      const result = await curriculumApi.stages.byCode(stageCode);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stage");
      }
      if (result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!stageCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    stage: query.data || null,
  };
}

export function useStageBySlug(stageSlug: string | null | undefined) {
  const query = useQuery({
    queryKey: ["stages", "by-slug", stageSlug],
    queryFn: async () => {
      if (!stageSlug) return null;

      const result = await curriculumApi.stages.bySlug(stageSlug);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch stage");
      }
      if (result.data) {
        return result.data;
      }
      return null;
    },
    enabled: !!stageSlug,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    stage: query.data || null,
  };
}

// Helper function to invalidate stage cache
export function useInvalidateStage() {
  const queryClient = useQueryClient();

  return {
    invalidateStage: (stageId: string) => {
      queryClient.invalidateQueries({ queryKey: ["stages", stageId] });
      queryClient.invalidateQueries({ queryKey: ["stages", "by-code"] });
      queryClient.invalidateQueries({ queryKey: ["stages", "by-slug"] });
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
    invalidateAllStages: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  };
}
