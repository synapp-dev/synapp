import type { CourseTopicRow, TopicSlideRow } from "@/types/db";
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { certificationApi } from "@/entities/certification/api/endpoints";

type CertificationTopic = CourseTopicRow;
type CertificationSlide = TopicSlideRow & {
  signedUrl?: string | null;
};

type CertificationTopicWithSlides = CertificationTopic & {
  slides?: CertificationSlide[];
  // Enriched data from view
  slideCount?: number;
  hasQuiz?: boolean;
  quizCompleted?: boolean;
  quizScorePercentage?: number | null;
};

// React Query hooks for certification topics
export function useCertificationTopicsByCourseCode(
  courseCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const query = useQuery({
    queryKey: ["certification", "topics", courseCode, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!courseCode) return [];

      const result = await certificationApi.topics.byCourseCode(courseCode, {
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification topics");
      }

      if (result.data) {
        return result.data as CertificationTopicWithSlides[];
      }

      return [];
    },
    enabled: !!courseCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Sort topics by courseOrder — memoized to keep a stable reference
  const sortedTopics = useMemo(() => {
    return (query.data || []).slice().sort((a, b) => {
      if (a.courseOrder === null) return 1;
      if (b.courseOrder === null) return -1;
      return a.courseOrder - b.courseOrder;
    });
  }, [query.data]);

  return {
    ...query,
    topics: sortedTopics,
  };
}

// Legacy hook for backward compatibility
export function useCertificationTopicsByStageCode(
  stageCode: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  return useCertificationTopicsByCourseCode(stageCode, options);
}

export function useCertificationTopic(
  topicId: string | null | undefined,
  options?: { includeSlides?: boolean; includeUrls?: boolean }
) {
  const query = useQuery({
    queryKey: ["certification", "topics", "by-id", topicId, options?.includeSlides, options?.includeUrls],
    queryFn: async () => {
      if (!topicId) return null;

      const result = await certificationApi.topics.byId(topicId, {
        includeSlides: options?.includeSlides,
        includeUrls: options?.includeUrls,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification topic");
      }

      if (result.data) {
        return result.data as CertificationTopicWithSlides;
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

// Helper function to invalidate certification topic cache
export function useInvalidateCertificationTopics() {
  const queryClient = useQueryClient();

  return {
    invalidateTopic: (topicId: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", "by-id", topicId] });
      queryClient.invalidateQueries({ queryKey: ["certification", "topics"] });
    },
    invalidateTopicsByCourseCode: (courseCode: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", courseCode] });
    },
    invalidateTopicsByStageCode: (stageCode: string) => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics", stageCode] });
    },
    invalidateAllTopics: () => {
      queryClient.invalidateQueries({ queryKey: ["certification", "topics"] });
    },
  };
}
