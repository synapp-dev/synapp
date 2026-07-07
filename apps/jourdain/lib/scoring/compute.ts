import {
  TASK_DOMAINS,
  type TaskDomain,
  type TaskStatus,
} from "@/entities/tasks/model/types";

// Daily life score, out of 100. Pure and explainable:
//   pillar score  = done / scheduled for that day's tasks in the pillar
//   day score     = equal-weight mean of pillars that had anything scheduled
// A pillar with nothing scheduled is neutral (score null) and never drags the
// day down. Gym days need no special case: the scheduled routine task
// auto-completes when the session finishes, so Health picks it up here.

/** Minimal slice of a task the engine needs. Dates are YYYY-MM-DD. */
export type ScoreTask = {
  status: TaskStatus;
  domains: TaskDomain[];
  dueDate: string | null;
  /** Set on routine-generated tasks; wins over dueDate as the scored day. */
  occurrenceDate: string | null;
};

export type PillarScore = {
  pillar: TaskDomain;
  completed: number;
  total: number;
  /** 0-100, or null when the pillar had nothing scheduled (neutral). */
  score: number | null;
};

export type DayScore = {
  date: string;
  /** 0-100, or null when no pillar had anything scheduled that day. */
  score: number | null;
  /** Always all five pillars, in TASK_DOMAINS order. */
  pillars: PillarScore[];
};

/** The day a task counts toward: routine occurrence first, else due date. */
export function scoreDate(task: ScoreTask): string | null {
  return task.occurrenceDate ?? task.dueDate;
}

/** Shift a YYYY-MM-DD date by whole days (UTC math, no DST surprises). */
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + delta)).toISOString().slice(0, 10);
}

export function computeDayScore(date: string, tasks: ScoreTask[]): DayScore {
  const buckets = new Map<TaskDomain, { completed: number; total: number }>(
    TASK_DOMAINS.map((pillar) => [pillar, { completed: 0, total: 0 }])
  );

  for (const task of tasks) {
    if (scoreDate(task) !== date) continue;
    // Skipped = an intentional pass, so it neither scores nor penalises.
    // Missed stays in the denominator: a locked-in fail for its scheduled day.
    if (task.status === "skipped") continue;
    for (const domain of new Set(task.domains)) {
      const bucket = buckets.get(domain);
      if (!bucket) continue;
      bucket.total += 1;
      if (task.status === "done") bucket.completed += 1;
    }
  }

  const pillars: PillarScore[] = TASK_DOMAINS.map((pillar) => {
    const { completed, total } = buckets.get(pillar)!;
    return {
      pillar,
      completed,
      total,
      score: total > 0 ? Math.round((completed / total) * 100) : null,
    };
  });

  const active = pillars.filter((pillar) => pillar.score !== null);
  const score =
    active.length > 0
      ? Math.round(
          active.reduce((sum, pillar) => sum + (pillar.score ?? 0), 0) /
            active.length
        )
      : null;

  return { date, score, pillars };
}

/** Day scores for the `days` dates ending at (and including) `endDate`. */
export function computeScoreHistory(
  endDate: string,
  days: number,
  tasks: ScoreTask[]
): DayScore[] {
  const byDate = new Map<string, ScoreTask[]>();
  for (const task of tasks) {
    const date = scoreDate(task);
    if (!date) continue;
    const list = byDate.get(date);
    if (list) list.push(task);
    else byDate.set(date, [task]);
  }

  const history: DayScore[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    history.push(computeDayScore(date, byDate.get(date) ?? []));
  }
  return history;
}
