import { addDays, type DayScore } from "@/lib/scoring/compute";
import { TASK_DOMAINS, type TaskDomain } from "@/entities/tasks/model/types";

// Week math and weekly aggregates for the review module. Weeks start on
// Monday; all dates are YYYY-MM-DD strings handled with UTC arithmetic.

export type ScoredDay = { date: string; score: number | null };

export type PillarWeek = {
  pillar: TaskDomain;
  completed: number;
  total: number;
  /** 0-100, or null when the pillar had nothing scheduled all week. */
  score: number | null;
};

/** Whole days from `a` to `b` (positive when `b` is later). */
export function dayDiff(a: string, b: string): number {
  const toUtc = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Monday of the week containing `date`. */
export function weekStartOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  return addDays(date, -((day + 6) % 7));
}

export function addWeeks(weekStart: string, delta: number): string {
  return addDays(weekStart, delta * 7);
}

/** Sunday of the week starting at `weekStart`. */
export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6);
}

/** The seven dates of the week, Monday through Sunday. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** Mean of the scored days, or null when nothing was scored. */
export function averageScore(days: ScoredDay[]): number | null {
  const scored = days.filter((day) => day.score !== null);
  if (scored.length === 0) return null;
  return Math.round(
    scored.reduce((sum, day) => sum + (day.score ?? 0), 0) / scored.length
  );
}

/**
 * Current streak of days scoring at or above `threshold`, counting back from
 * the last entry. Neutral days (score null) neither count nor break it, so a
 * rest day keeps a streak alive without inflating it. When `todayIso` is
 * given, a sub-threshold score on that date is treated as in-progress and
 * skipped rather than breaking the streak.
 */
export function currentStreak(
  days: ScoredDay[],
  threshold = 50,
  todayIso?: string
): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const { date, score } = days[i]!;
    if (score === null) continue;
    if (score < threshold) {
      if (date === todayIso) continue;
      break;
    }
    streak += 1;
  }
  return streak;
}

/** Per-pillar completed/scheduled totals across a set of day scores. */
export function pillarWeekTotals(days: DayScore[]): PillarWeek[] {
  return TASK_DOMAINS.map((pillar) => {
    let completed = 0;
    let total = 0;
    for (const day of days) {
      const entry = day.pillars.find((p) => p.pillar === pillar);
      if (!entry) continue;
      completed += entry.completed;
      total += entry.total;
    }
    return {
      pillar,
      completed,
      total,
      score: total > 0 ? Math.round((completed / total) * 100) : null,
    };
  });
}
