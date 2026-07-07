import type { Task } from "@/entities/tasks/model/types";

export type ProjectTaskStats = {
  open: number;
  done: number;
  /** Open tasks in the project, sorted by priority (highest first). */
  openTasks: Task[];
};

export const EMPTY_PROJECT_STATS: ProjectTaskStats = {
  open: 0,
  done: 0,
  openTasks: [],
};

/** Per-project open/done counts and sorted open tasks, built in a single pass
 *  over the task list instead of one full scan per project. */
export function projectTaskStats(
  tasks: Task[] | undefined
): Map<string, ProjectTaskStats> {
  const byProject = new Map<string, ProjectTaskStats>();
  for (const task of tasks ?? []) {
    if (task.projectId === null) continue;
    let entry = byProject.get(task.projectId);
    if (!entry) {
      entry = { open: 0, done: 0, openTasks: [] };
      byProject.set(task.projectId, entry);
    }
    if (task.status === "open") {
      entry.open += 1;
      entry.openTasks.push(task);
    } else if (task.status === "done") {
      entry.done += 1;
    }
  }
  for (const entry of byProject.values()) {
    entry.openTasks.sort((a, b) => a.priority - b.priority);
  }
  return byProject;
}
