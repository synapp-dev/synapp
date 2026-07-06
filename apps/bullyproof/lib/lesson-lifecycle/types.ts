/** Persisted lesson statuses (matches DB check constraint). */
export type LessonPersistedStatus =
  | "preparing"
  | "ready"
  | "in_progress"
  | "feedback"
  | "completed"
  | "cancelled";

/** Lesson sub-routes under `/schools/{slug}/lessons/{id}/…`. */
export type LessonSubPage =
  | "overview"
  | "prepare"
  | "run-lesson"
  | "feedback"
  | "deliver"
  | "history";

export const LIVE_LESSON_STATUSES = ["in_progress", "feedback"] as const;

export const TAKE_OVERABLE_STATUSES = [
  "preparing",
  "ready",
  "in_progress",
] as const;

/** Typical forward transitions (not enforced server-side in this module). */
export const TYPICAL_TRANSITIONS: Record<
  LessonPersistedStatus,
  LessonPersistedStatus[]
> = {
  preparing: ["ready", "cancelled"],
  ready: ["in_progress", "preparing", "cancelled"],
  in_progress: ["feedback", "cancelled"],
  feedback: ["completed", "cancelled"],
  completed: ["cancelled"],
  cancelled: [],
};
