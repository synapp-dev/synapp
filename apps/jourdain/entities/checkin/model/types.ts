import type { TaskDomain, TaskPriority } from "@/entities/tasks/model/types";

export type CheckinAnswer =
  | "did"
  | "missed"
  | "move_today"
  | "drop"
  | "not_yet";

export type CheckinItem = {
  taskId: string;
  title: string;
  /**
   * missed = a locked-in missed occurrence; today = an open routine due today;
   * oneoff = an open task past its due date.
   */
  kind: "missed" | "today" | "oneoff";
  /** The day the task counts toward (occurrence date, else due date). */
  date: string;
  domains: TaskDomain[];
  priority: TaskPriority;
  /** The check-in should ask what time it was done. */
  trackTime: boolean;
};

export type CheckinGroup = { date: string; items: CheckinItem[] };

export type CheckinReview = {
  /** Grouped by date, newest first. */
  groups: CheckinGroup[];
  lastCheckinAt: string | null;
};

export type CheckinRespondInput = {
  taskId: string;
  answer: CheckinAnswer;
  /** The client's local YYYY-MM-DD; required for move_today. */
  clientDate?: string;
  /** HH:mm 24h time-of-day for track_time completions. */
  completedTime?: string;
};
