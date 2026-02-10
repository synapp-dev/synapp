import { useQuery, useQueryClient } from "@tanstack/react-query";
import { topicsApi } from "@/entities/topics/api/endpoints";
import type { topics, topicSlides } from "@/server/db/schema";

type Topic = typeof topics.$inferSelect;
type TopicSlide = typeof topicSlides.$inferSelect & {
  signedUrl?: string | null;
};

type TopicWithSlides = Topic & {
  slides?: TopicSlide[];
};

// React Query hooks for topics
export function useTopicsByStage(
  stageId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const query = useQuery({
    queryKey: ["topics", stageId, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!stageId) return [];

      const result = await topicsApi.get.list({
        stageId,
        limit: 100,
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch topics");
      }

      if (result.data) {
        return result.data as TopicWithSlides[];
      }

      return [];
    },
    enabled: !!stageId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Sort topics by stageOrder
  const sortedTopics = (query.data || []).slice().sort((a, b) => {
    if (a.stageOrder === null) return 1;
    if (b.stageOrder === null) return -1;
    return a.stageOrder - b.stageOrder;
  });

  return {
    ...query,
    topics: sortedTopics,
  };
}

export function useTopic(
  topicId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const query = useQuery({
    queryKey: [
      "topics",
      "by-id",
      topicId,
      options?.includeSlides,
      options?.includeUrls,
    ],
    queryFn: async () => {
      if (!topicId) return null;

      const result = await topicsApi.get.byId(topicId);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch topic");
      }

      if (result.data) {
        return result.data as TopicWithSlides;
      }

      return null;
    },
    enabled: !!topicId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    topic: query.data || null,
  };
}

// Helper function to invalidate topic cache
export function useInvalidateTopics() {
  const queryClient = useQueryClient();

  return {
    invalidateTopic: (topicId: string) => {
      queryClient.invalidateQueries({
        queryKey: ["topics", "by-id", topicId],
      });
      // Also invalidate any stage queries that might contain this topic
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    invalidateTopicsByStage: (stageId: string) => {
      queryClient.invalidateQueries({ queryKey: ["topics", stageId] });
    },
    invalidateAllTopics: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  };
}
