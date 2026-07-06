"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useLessonStatusRealtime } from "@/hooks/use-lesson-status-realtime";
import { resolveRealtimeStatusRedirect } from "@/lib/lesson-lifecycle";

interface LessonStatusRedirectProps {
  schoolId: string;
  lessonId: string;
  children: React.ReactNode;
}

/**
 * Listens for lesson status changes and redirects per lifecycle rules.
 */
export function LessonStatusRedirect({
  schoolId,
  lessonId,
  children,
}: LessonStatusRedirectProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const target = resolveRealtimeStatusRedirect({
        schoolSlug: schoolId,
        lessonId,
        newStatus,
        pathname,
      });
      if (target) {
        router.replace(target);
      }
    },
    [pathname, router, schoolId, lessonId]
  );

  useLessonStatusRealtime(lessonId, {
    onStatusChange: handleStatusChange,
  });

  return <>{children}</>;
}
