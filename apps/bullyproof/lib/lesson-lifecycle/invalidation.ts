import { lessonsKeys } from "@/entities/lessons/model/keys";

export type InvalidationKey = readonly unknown[];

/** Query keys to invalidate when a lesson's status changes. */
export function getLessonStatusInvalidationKeys(
  lessonId: string,
  userId?: string
): InvalidationKey[] {
  const keys: InvalidationKey[] = [
    lessonsKeys.detail(lessonId),
    ["lesson", lessonId],
    ["lesson-details", lessonId],
    ["lesson-feedback", lessonId],
    ["live-lessons"],
    ["in-progress-lessons"],
  ];

  if (userId) {
    keys.push(["live-lessons", userId], ["in-progress-lessons", userId]);
  }

  return keys;
}

/** Keys for refreshing lesson detail + live state on tab focus (run-lesson page). */
export function getLessonDetailRefreshKeys(lessonId: string): InvalidationKey[] {
  return [lessonsKeys.detail(lessonId), ["lesson", lessonId, "live-state"]];
}
