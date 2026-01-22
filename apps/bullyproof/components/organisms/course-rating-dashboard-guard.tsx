"use client";

import { useEffect, useState, useMemo } from "react";
import { usePathname, useParams } from "next/navigation";
import { CourseRatingModal } from "./course-rating-modal";
import { certificationApi } from "@/entities/certification/api/endpoints";

interface UnratedCourse {
  id: string;
  name: string;
  completedAt: string | null;
}

export function CourseRatingDashboardGuard() {
  const pathname = usePathname();
  const params = useParams();
  const [unratedCourses, setUnratedCourses] = useState<UnratedCourse[]>([]);
  const [currentCourseIndex, setCurrentCourseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Check if we're on dashboard or course page
  const isDashboard = useMemo(() => {
    if (!pathname) return false;
    return pathname === "/dashboard" || pathname.startsWith("/dashboard");
  }, [pathname]);
  
  const isCoursePage = useMemo(() => {
    return Boolean(pathname?.startsWith("/courses/") && params?.course_name);
  }, [pathname, params?.course_name]);
  
  const currentCourseSlug = useMemo(() => {
    return isCoursePage ? (params?.course_name as string) ?? null : null;
  }, [isCoursePage, params?.course_name]);

  // Fetch unrated courses on mount (on dashboard or course page)
  useEffect(() => {
    if (!isDashboard && !isCoursePage) return;

    const fetchUnratedCourses = async () => {
      try {
        setIsLoading(true);
        console.log("[CourseRating] Fetching unrated courses...");
        const result = await certificationApi.courses.unrated();
        console.log("[CourseRating] Unrated courses result:", result);
        if (result.data) {
          console.log("[CourseRating] Found unrated courses:", result.data.length);
          setUnratedCourses(result.data);
          
          // On dashboard: show modal if there are any unrated courses
          // On course page: show modal only if current course is unrated
          if (isDashboard) {
            if (result.data.length > 0) {
              console.log("[CourseRating] Showing rating modal for:", result.data[0].name);
              setShowRatingModal(true);
            } else {
              console.log("[CourseRating] No unrated courses found");
            }
          } else if (isCoursePage && currentCourseSlug) {
            // Find the current course in unrated courses by matching slug
            // We need to fetch course details to match by ID
            try {
              const courseResult = await certificationApi.courses.bySlug(currentCourseSlug);
              if (courseResult.data) {
                const currentCourseInUnrated = result.data.find(
                  (c) => c.id === courseResult.data.id
                );
                if (currentCourseInUnrated) {
                  const index = result.data.findIndex((c) => c.id === currentCourseInUnrated.id);
                  setCurrentCourseIndex(index >= 0 ? index : 0);
                  console.log("[CourseRating] Showing rating modal for current course:", currentCourseInUnrated.name);
                  setShowRatingModal(true);
                } else {
                  console.log("[CourseRating] Current course is not in unrated list");
                }
              }
            } catch (err) {
              console.error("[CourseRating] Failed to fetch current course:", err);
            }
          }
        } else {
          console.error("[CourseRating] Error fetching unrated courses:", result.error);
        }
      } catch (error) {
        console.error("[CourseRating] Failed to fetch unrated courses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUnratedCourses();
  }, [isDashboard, isCoursePage, currentCourseSlug]);

  const currentCourse = unratedCourses[currentCourseIndex];

  const handleRatingSubmit = async () => {
    // Remove the current course from the list since it's been rated
    const updatedCourses = unratedCourses.filter((_, index) => index !== currentCourseIndex);
    setUnratedCourses(updatedCourses);
    
    // On course page: just close modal after rating
    if (isCoursePage) {
      setShowRatingModal(false);
      setCurrentCourseIndex(0);
      return;
    }
    
    // On dashboard: show next course if available
    if (updatedCourses.length > 0) {
      // If we removed the last item, go back one index
      if (currentCourseIndex >= updatedCourses.length) {
        setCurrentCourseIndex(updatedCourses.length - 1);
      }
      // Otherwise stay on same index (which now points to next course)
      // Modal stays open for next course
    } else {
      // All courses rated, close modal
      setShowRatingModal(false);
      setCurrentCourseIndex(0);
    }
  };

  const handleRatingSkip = async () => {
    // On course page: just close modal after skip
    if (isCoursePage) {
      setShowRatingModal(false);
      setUnratedCourses([]);
      return;
    }
    
    // On dashboard: move to next course (skip current one)
    if (currentCourseIndex < unratedCourses.length - 1) {
      setCurrentCourseIndex(currentCourseIndex + 1);
      // Modal stays open for next course
    } else {
      // All courses skipped, close modal and clear list
      setShowRatingModal(false);
      setUnratedCourses([]);
    }
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // On course page: just close, don't try to show other courses
      if (isCoursePage) {
        setShowRatingModal(false);
        setUnratedCourses([]);
        return;
      }
      
      // On dashboard: move to next course or close
      if (currentCourseIndex < unratedCourses.length - 1) {
        setCurrentCourseIndex(currentCourseIndex + 1);
        // Keep modal open for next course
        setTimeout(() => {
          setShowRatingModal(true);
        }, 100);
      } else {
        setShowRatingModal(false);
        setUnratedCourses([]);
      }
    }
  };

  // Debug logging
  useEffect(() => {
    console.log("[CourseRating] Dashboard guard state:", {
      isDashboard,
      isCoursePage,
      pathname,
      isLoading,
      unratedCoursesCount: unratedCourses.length,
      currentCourseIndex,
      currentCourse: currentCourse?.name,
      showRatingModal,
    });
  }, [isDashboard, isCoursePage, pathname, isLoading, unratedCourses.length, currentCourseIndex, showRatingModal]);

  // Don't render if not on dashboard or course page
  if (!isDashboard && !isCoursePage) {
    return null;
  }

  // Show loading state or wait for courses
  if (isLoading) {
    return null;
  }

  // Don't render modal if no courses to rate
  if (!currentCourse || unratedCourses.length === 0) {
    return null;
  }

  return (
    <CourseRatingModal
      open={showRatingModal}
      onOpenChange={handleModalClose}
      courseId={currentCourse.id}
      courseName={currentCourse.name}
      onSubmit={handleRatingSubmit}
      onSkip={handleRatingSkip}
    />
  );
}
