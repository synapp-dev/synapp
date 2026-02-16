"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";

interface LessonStatusRedirectProps {
  schoolId: string;
  lessonId: string;
  children: React.ReactNode;
}

/**
 * Client component that listens for lesson status changes and redirects
 * to the feedback page when the lesson becomes completed or enters feedback stage
 */
export function LessonStatusRedirect({
  schoolId,
  lessonId,
  children,
}: LessonStatusRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleStatusChange = useCallback(
    (newStatus: string, oldStatus: string) => {
      // Redirect to feedback when lesson becomes completed or feedback
      // (but not if already on feedback page)
      if (
        (newStatus === "completed" || newStatus === "feedback") &&
        !pathname.includes("/feedback")
      ) {
        console.log(
          `[LessonStatusRedirect] Redirecting to feedback page (status: ${oldStatus} -> ${newStatus})`
        );
        router.replace(`/schools/${schoolId}/lessons/${lessonId}/feedback`);
      }
    },
    [pathname, router, schoolId, lessonId]
  );

  useLessonStatusRealtime(lessonId, {
    onStatusChange: handleStatusChange,
  });

  return <>{children}</>;
}
