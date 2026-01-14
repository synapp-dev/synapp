import { create } from "zustand";
import { useQuery, useQueryClient, useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { lessonsApi } from "../api/endpoints";
import { lessonsKeys } from "./keys";
import type { lessons } from "@/server/db/schema";

type Lesson = typeof lessons.$inferSelect;

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

interface LessonsState {
  // Normalized cache: lessonId -> LessonWithDetails
  lessons: Record<string, LessonWithDetails>;
  // List of lesson IDs (for maintaining order)
  lessonIds: string[];
  // Actions
  setLessons: (lessons: LessonWithDetails[]) => void;
  setLesson: (lesson: LessonWithDetails) => void;
  updateLesson: (id: string, lesson: Partial<LessonWithDetails>) => void;
  removeLesson: (id: string) => void;
  clearLessons: () => void;
}

export const useLessonsStore = create<LessonsState>((set) => ({
  lessons: {},
  lessonIds: [],

  setLessons: (lessons) =>
    set({
      lessons: lessons.reduce(
        (acc, lesson) => {
          acc[lesson.id] = lesson;
          return acc;
        },
        {} as Record<string, LessonWithDetails>
      ),
      lessonIds: lessons.map((l) => l.id),
    }),

  setLesson: (lesson) =>
    set((state) => {
      const newLessons = { ...state.lessons, [lesson.id]: lesson };
      const newLessonIds = state.lessonIds.includes(lesson.id)
        ? state.lessonIds
        : [...state.lessonIds, lesson.id];
      return { lessons: newLessons, lessonIds: newLessonIds };
    }),

  updateLesson: (id, lesson) =>
    set((state) => {
      if (!state.lessons[id]) return state;
      return {
        lessons: {
          ...state.lessons,
          [id]: { ...state.lessons[id], ...lesson },
        },
      };
    }),

  removeLesson: (id) =>
    set((state) => {
      const { [id]: removed, ...lessons } = state.lessons;
      return {
        lessons,
        lessonIds: state.lessonIds.filter((lessonId) => lessonId !== id),
      };
    }),

  clearLessons: () => set({ lessons: {}, lessonIds: [] }),
}));

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
  const { lessons, lessonIds, setLessons, setLesson } = useLessonsStore();

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
      // Check if we already have full details in React Query cache
      const cached = queryClient.getQueryData<LessonWithDetails | null>(
        lessonsKeys.detail(lesson.id)
      );
      if (cached?.topic && cached?.teacher !== undefined) {
        return false; // Already have full details
      }
      
      return true; // Need to fetch details
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
      enabled: !!lesson.id && listQuery.isSuccess,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000, // 5 minutes
      // Use cached data if available
      initialData: () => {
        const cached = queryClient.getQueryData<LessonWithDetails | null>(
          lessonsKeys.detail(lesson.id)
        );
        return cached;
      },
    })),
  });

  // Combine list data with detail data (don't depend on Zustand to avoid circular updates)
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

      // Fallback: use Zustand store for initial data only (read-only, not in dependencies)
      const zustandCached = lessons[lesson.id];
      if (zustandCached?.topic && zustandCached?.teacher !== undefined) {
        return {
          ...lesson,
          topic: zustandCached.topic,
          teacher: zustandCached.teacher,
          assignedClasses: zustandCached.assignedClasses,
        };
      }

      return lesson as LessonWithDetails;
    });
  }, [listQuery.data, detailQueries, queryClient]);

  // Track previous lessonsWithDetails to prevent unnecessary updates
  const prevLessonsRef = useRef<LessonWithDetails[]>([]);
  
  // Update Zustand store when data changes (only if actually changed)
  useEffect(() => {
    // Compare by IDs and content to avoid unnecessary updates
    const hasChanged = 
      prevLessonsRef.current.length !== lessonsWithDetails.length ||
      lessonsWithDetails.some((lesson, index) => {
        const prev = prevLessonsRef.current[index];
        return !prev || 
          prev.id !== lesson.id ||
          prev.topic?.id !== lesson.topic?.id ||
          prev.teacher?.id !== lesson.teacher?.id;
      });

    if (hasChanged && lessonsWithDetails.length > 0) {
      prevLessonsRef.current = lessonsWithDetails;
      setLessons(lessonsWithDetails);
    }
  }, [lessonsWithDetails, setLessons]);

  // Update individual lessons in store as detail queries complete
  useEffect(() => {
    detailQueries.forEach((query) => {
      if (query.data) {
        // Only update if the lesson data is actually new or different
        const existing = lessons[query.data.id];
        if (!existing || 
            existing.topic?.id !== query.data.topic?.id ||
            existing.teacher?.id !== query.data.teacher?.id) {
          setLesson(query.data);
        }
      }
    });
  }, [detailQueries, setLesson, lessons]);

  // Only show loading if list is loading or if we're fetching details and they're loading
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
