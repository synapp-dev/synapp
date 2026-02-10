import { useQuery, useQueryClient } from "@tanstack/react-query";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationCourses } from "@/server/db/schema";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

// React Query hooks for certification courses
export function useCertificationCourses() {
  const query = useQuery({
    queryKey: ["certification", "courses"],
    queryFn: async () => {
      const result = await certificationApi.courses.list({ limit: 100 });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification courses");
      }
      if (result.data) {
        // Sort by sortIndex to ensure correct order
        return [...result.data].sort((a, b) => a.sortIndex - b.sortIndex);
      }
      return [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    courses: query.data || [],
  };
}

// Legacy hook for backward compatibility
export function useCertificationStages() {
  return useCertificationCourses();
}

export function useCertificationCourseByCode(courseCode: string | null | undefined) {
  const query = useQuery({
    queryKey: ["certification", "courses", "by-code", courseCode],
    queryFn: async () => {
      if (!courseCode) return null;

      const result = await certificationApi.courses.byCode(courseCode);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification course");
      }
      return result.data || null;
    },
    enabled: !!courseCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    course: query.data || null,
  };
}

// Legacy hook for backward compatibility
export function useCertificationStageByCode(stageCode: string | null | undefined) {
  return useCertificationCourseByCode(stageCode);
}

// Reactive hook (now just delegates to TQ hook)
export function useCertificationCourse(courseCode: string | null | undefined) {
  const { course, isLoading, isError, error } = useCertificationCourseByCode(courseCode);
  return {
    course,
    isLoading,
    error: isError ? (error?.message || "Failed to fetch course") : null,
  };
}

// Hook for invalidating certification course cache
export function useInvalidateCertificationCourse() {
  const queryClient = useQueryClient();

  const invalidateAllCourses = () => {
    queryClient.invalidateQueries({ queryKey: ["certification", "courses"] });
  };

  const invalidateCourse = (courseId: string) => {
    queryClient.invalidateQueries({ queryKey: ["certification", "courses"] });
    queryClient.invalidateQueries({ queryKey: ["certification", "courses", courseId] });
  };

  const invalidateCourseByCode = (code: string) => {
    queryClient.invalidateQueries({ queryKey: ["certification", "courses"] });
    queryClient.invalidateQueries({ queryKey: ["certification", "courses", "by-code", code] });
  };

  return {
    invalidateAllCourses,
    invalidateCourse,
    invalidateCourseByCode,
  };
}

// Legacy hook for backward compatibility
export function useInvalidateCertificationStage() {
  return useInvalidateCertificationCourse();
}
