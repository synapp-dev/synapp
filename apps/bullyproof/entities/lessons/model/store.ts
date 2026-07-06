import type { LessonRow } from "@/types/db";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { lessonsApi } from "../api/endpoints";
import { lessonsKeys } from "./keys";

type Lesson = LessonRow;

export type LessonWithDetails = Lesson & {
  topic?: {
    id: string;
    title: string;
    [key: string]: any;
  } | null;
  teacher?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  assignedClasses?: Array<{
    classId: string;
    className: string;
    classCode: string | null;
  }> | null;
};

// Reject "undefined", "null", and non-UUID strings to prevent invalid API calls
function isValidLessonId(id: string | undefined | null): boolean {
  if (!id || id === "undefined" || id === "null") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// React Query hooks for lessons
export function useLessons(filters?: {
  schoolId?: string;
  teacherId?: string;
  classId?: string;
  topicId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
}) {
  const queryClient = useQueryClient();

  // Normalize filters for consistent query keys
  const normalizedFilters = filters
    ? (() => {
        const filtered = Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== ""
          )
        );
        return Object.keys(filtered).length > 0 ? filtered : undefined;
      })()
    : undefined;

  // Fetch lessons list
  const listQuery = useQuery({
    queryKey: lessonsKeys.listLessons(normalizedFilters),
    queryFn: async () => {
      const result = await lessonsApi.get.list(normalizedFilters);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch lessons");
      }
      return result.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
  });

  // Get lesson IDs from the list
  const lessonIdsFromList = listQuery.data?.map((l) => l.id) || [];

  // Only fetch details for lessons that don't have full details cached
  const lessonsNeedingDetails = useMemo(() => {
    if (!listQuery.data) return [];
    
    return listQuery.data.filter((lesson) => {
      if (!isValidLessonId(lesson.id)) return false;
      const cached = queryClient.getQueryData<LessonWithDetails | null>(
        lessonsKeys.detail(lesson.id)
      );
      if (cached?.topic && cached?.teacher !== undefined) {
        return false;
      }
      return true;
    });
  }, [listQuery.data, queryClient]);

  // Fetch details for lessons that need them in parallel
  const detailQueries = useQueries({
    queries: lessonsNeedingDetails.map((lesson) => ({
      queryKey: lessonsKeys.detail(lesson.id),
      queryFn: async () => {
        const result = await lessonsApi.get.byId(lesson.id);
        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch lesson details");
        }
        return result.data ?? null;
      },
      enabled: isValidLessonId(lesson.id) && listQuery.isSuccess,
      staleTime: 2 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      initialData: () => {
        const cached = queryClient.getQueryData<LessonWithDetails | null>(
          lessonsKeys.detail(lesson.id)
        );
        return cached;
      },
    })),
  });

  // Combine list data with detail data
  const lessonsWithDetails: LessonWithDetails[] = useMemo(() => {
    if (!listQuery.data) return [];

    return listQuery.data.map((lesson) => {
      // First check React Query cache
      const reactQueryCached = queryClient.getQueryData<LessonWithDetails | null>(
        lessonsKeys.detail(lesson.id)
      );
      if (reactQueryCached?.topic && reactQueryCached?.teacher !== undefined) {
        return {
          ...lesson,
          topic: reactQueryCached.topic,
          teacher: reactQueryCached.teacher,
          assignedClasses: reactQueryCached.assignedClasses,
        };
      }

      // Then check detail query results
      const detailQuery = detailQueries.find(
        (q) => q.data?.id === lesson.id
      );
      if (detailQuery?.data) {
        return {
          ...lesson,
          topic: detailQuery.data.topic,
          teacher: detailQuery.data.teacher,
          assignedClasses: detailQuery.data.assignedClasses,
        };
      }

      return lesson as LessonWithDetails;
    });
  }, [listQuery.data, detailQueries, queryClient]);

  const isLoading = listQuery.isLoading || (lessonsNeedingDetails.length > 0 && detailQueries.some((q) => q.isLoading));
  const isError = listQuery.isError || detailQueries.some((q) => q.isError);
  const error = listQuery.error || detailQueries.find((q) => q.error)?.error;

  return {
    lessons: lessonsWithDetails,
    isLoading,
    isError,
    error,
    refetch: listQuery.refetch,
  };
}
