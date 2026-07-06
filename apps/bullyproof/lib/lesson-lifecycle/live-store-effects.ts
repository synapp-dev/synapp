import { LIVE_LESSON_STATUSES } from "./types";

export function isLiveLessonStatus(status: string): boolean {
  return (LIVE_LESSON_STATUSES as readonly string[]).includes(status);
}

export function shouldStopLiveLesson(
  newStatus: string,
  lessonId: string,
  currentLiveLessonId: string | null
): boolean {
  return newStatus === "completed" && currentLiveLessonId === lessonId;
}

export function shouldRefetchLiveLessonStore(
  oldStatus: string,
  newStatus: string
): boolean {
  return (
    isLiveLessonStatus(newStatus) ||
    isLiveLessonStatus(oldStatus) ||
    newStatus === "completed"
  );
}
