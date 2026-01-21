import { create } from "zustand";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { certificationApi } from "@/entities/certification/api/endpoints";
import type { certificationCourses } from "@/server/db/schema";

type Course = typeof certificationCourses.$inferSelect & {
  topicCount?: number;
};

type CertificationCoursesState = {
  // Normalized cache: courseCode -> Course
  courses: Record<string, Course>;
  // Loading states for each course
  loading: Record<string, boolean>;
  // Error states for each course
  errors: Record<string, string | null>;
  
  // Actions
  setCourse: (course: Course) => void;
  setCourses: (courses: Course[]) => void;
  clearAll: () => void;
  
  // Reactive fetching - auto-fetches if missing
  getCourse: (courseCode: string) => Promise<Course | null>;
  
  // Legacy support
  stages: Course[];
  setStages: (stages: Course[]) => void;
};

export const useCertificationCoursesStore = create<CertificationCoursesState>((set, get) => ({
  courses: {},
  loading: {},
  errors: {},
  stages: [],
  
  setCourse: (course) =>
    set((state) => ({
      courses: { ...state.courses, [course.code]: course },
    })),
  
  setCourses: (courses) => {
    const coursesMap: Record<string, Course> = {};
    courses.forEach((course) => {
      coursesMap[course.code] = course;
    });
    set({ courses: coursesMap, stages: courses }); // Also update legacy stages
  },
  
  setStages: (stages) => {
    const coursesMap: Record<string, Course> = {};
    stages.forEach((course) => {
      coursesMap[course.code] = course;
    });
    set({ stages, courses: coursesMap }); // Also update courses
  },
  
  clearAll: () => set({ courses: {}, stages: [], loading: {}, errors: {} }),
  
  // Reactive fetching method - checks cache first, fetches if missing
  getCourse: async (courseCode: string) => {
    const state = get();
    
    // Check cache first
    if (state.courses[courseCode]) {
      return state.courses[courseCode];
    }
    
    // If already loading, wait a bit and check cache again
    if (state.loading[courseCode]) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          const currentState = get();
          if (!currentState.loading[courseCode]) {
            clearInterval(checkInterval);
            resolve(currentState.courses[courseCode] || null);
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 5000);
      });
    }
    
    // Set loading state
    set((s) => ({
      loading: { ...s.loading, [courseCode]: true },
      errors: { ...s.errors, [courseCode]: null },
    }));
    
    try {
      const result = await certificationApi.courses.byCode(courseCode);
      
      if (result.error) {
        const errorMessage = result.error.message || "Failed to fetch certification course";
        set((s) => ({
          loading: { ...s.loading, [courseCode]: false },
          errors: { ...s.errors, [courseCode]: errorMessage },
        }));
        return null;
      }
      
      if (result.data) {
        // Cache the course
        set((s) => ({
          courses: { ...s.courses, [courseCode]: result.data! },
          loading: { ...s.loading, [courseCode]: false },
          errors: { ...s.errors, [courseCode]: null },
        }));
        return result.data;
      }
      
      set((s) => ({
        loading: { ...s.loading, [courseCode]: false },
        errors: { ...s.errors, [courseCode]: "Course not found" },
      }));
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch certification course";
      set((s) => ({
        loading: { ...s.loading, [courseCode]: false },
        errors: { ...s.errors, [courseCode]: errorMessage },
      }));
      return null;
    }
  },
}));

// Legacy export for backward compatibility
export const useCertificationStore = useCertificationCoursesStore;

// React Query hooks for certification courses
export function useCertificationCourses() {
  const queryClient = useQueryClient();
  const { courses, setCourses } = useCertificationCoursesStore();

  const query = useQuery({
    queryKey: ["certification", "courses"],
    queryFn: async () => {
      const result = await certificationApi.courses.list({ limit: 100 });
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification courses");
      }
      if (result.data) {
        // Sort by sortIndex to ensure correct order
        const sorted = [...result.data].sort(
          (a, b) => a.sortIndex - b.sortIndex
        );
        // Update Zustand store
        setCourses(sorted);
        return sorted;
      }
      return [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    // Use initialData from Zustand if available for immediate display
    initialData: () => {
      const coursesArray = Object.values(courses);
      return coursesArray.length > 0 ? coursesArray : undefined;
    },
  });

  // Use React Query's cached data (which includes initialData) for immediate display
  // This ensures cached data is shown instantly without waiting for Zustand sync
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
  const queryClient = useQueryClient();
  const { courses, setCourse, getCourse } = useCertificationCoursesStore();

  const query = useQuery({
    queryKey: ["certification", "courses", "by-code", courseCode],
    queryFn: async () => {
      if (!courseCode) return null;

      const result = await certificationApi.courses.byCode(courseCode);
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch certification course");
      }
      if (result.data) {
        // Update Zustand store
        setCourse(result.data);
        return result.data;
      }
      return null;
    },
    enabled: !!courseCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Use React Query's cached data directly for immediate display
  // Fallback to Zustand store if React Query doesn't have data yet
  const cachedCourse = query.data || (courseCode ? courses[courseCode] || null : null);

  return {
    ...query,
    course: cachedCourse,
  };
}

// Legacy hook for backward compatibility
export function useCertificationStageByCode(stageCode: string | null | undefined) {
  return useCertificationCourseByCode(stageCode);
}

// Reactive hook that uses store's getCourse method
export function useCertificationCourse(courseCode: string | null | undefined) {
  const { courses, getCourse, loading, errors } = useCertificationCoursesStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseCode) {
      setCourse(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = courses[courseCode];
    if (cached) {
      setCourse(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Check loading/error state
    setIsLoading(loading[courseCode] || false);
    setError(errors[courseCode] || null);

    // Fetch if not in cache
    getCourse(courseCode).then((fetchedCourse) => {
      setCourse(fetchedCourse);
      setIsLoading(false);
      setError(fetchedCourse ? null : errors[courseCode] || "Course not found");
    });
  }, [courseCode, courses, getCourse, loading, errors]);

  return {
    course,
    isLoading,
    error,
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
