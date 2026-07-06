"use client";

import { useLessonAccess } from "@/hooks/use-lesson-access";

/**
 * @deprecated Use `useLessonAccess()` — kept for existing imports.
 */
export function useIsAdminRestrictedForLessons(): boolean {
  return useLessonAccess().isAdminRestrictedForCreate;
}
