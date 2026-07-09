export type TaskStatus = "open" | "done" | "skipped" | "missed";

export const TASK_DOMAINS = [
  "identity",
  "health",
  "work",
  "social",
  "finance",
] as const;

export type TaskDomain = (typeof TASK_DOMAINS)[number];

/** Todoist-style: 1 = urgent, 2 = high, 3 = medium, 4 = default. */
export type TaskPriority = 1 | 2 | 3 | 4;

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  domains: TaskDomain[];
  dueDate: string | null;
  /** Optional link to a work project. */
  projectId: string | null;
  /** ISO timestamp to push a reminder, or null for none. */
  remindAt: string | null;
  completedAt: string | null;
  /** User-entered HH:mm time-of-day for time-tracked completions. */
  loggedTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateTaskInput = {
  title: string;
  notes?: string | null;
  dueDate?: string | null;
  projectId?: string | null;
  remindAt?: string | null;
  priority?: TaskPriority;
  domains?: TaskDomain[];
};

export type UpdateTaskInput = {
  title?: string;
  notes?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  projectId?: string | null;
  remindAt?: string | null;
  priority?: TaskPriority;
  domains?: TaskDomain[];
  /** HH:mm time-of-day, or null to clear. */
  loggedTime?: string | null;
};
