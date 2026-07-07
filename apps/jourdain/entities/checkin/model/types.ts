import type { TaskDomain, TaskPriority } from "@/entities/tasks/model/types";

export type CheckinAnswer = "did" | "missed" | "move_today" | "drop";

export type CheckinItem = {
  taskId: string;
  title: string;
  /** routine = a missed occurrence; oneoff = an open task past its due date. */
  kind: "routine" | "oneoff";
  /** The day the task counts toward (occurrence date, else due date). */
  date: string;
  domains: TaskDomain[];
  priority: TaskPriority;
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
};
