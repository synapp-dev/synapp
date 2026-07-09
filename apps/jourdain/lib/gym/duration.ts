import { SESSION_DEFAULTS, type SetKind } from "@/entities/gym/model/types";

// Rough wall-clock estimate for a planned session, used by the ad-hoc wizard to
// size a session to a chosen duration and to show a running "About N min" line.
// A set costs its rest plus the time under load; each exercise adds a fixed
// setup transition. Approximate by design — real sessions vary with the lifter.

/** Seconds of actual work per set (the reps themselves). */
export const WORK_SECONDS_PER_SET = 40;
/** Fixed setup/changeover time between exercises. */
export const TRANSITION_SECONDS = 60;

/** One plan row's set structure — the subset duration math needs. */
export type DurationRow = {
  warmupSets: number;
  workingSets: number;
  dropSets: number;
  /** null ⇒ auto: fall back to per-kind rest defaults. */
  restSeconds: number | null;
};

/** Time for one set of a given kind: rest between sets plus time under load. */
export function perSetSeconds(restSeconds: number | null, kind: SetKind): number {
  const rest = restSeconds ?? SESSION_DEFAULTS.restSecondsByKind[kind];
  return rest + WORK_SECONDS_PER_SET;
}

/** Total seconds for one exercise, across its warmup/working/drop sets. */
export function exerciseSeconds(row: DurationRow): number {
  return (
    TRANSITION_SECONDS +
    row.warmupSets * perSetSeconds(row.restSeconds, "warmup") +
    row.workingSets * perSetSeconds(row.restSeconds, "working") +
    row.dropSets * perSetSeconds(row.restSeconds, "drop")
  );
}

/** Estimated minutes for a whole plan. */
export function estimateSessionMinutes(rows: DurationRow[]): number {
  const total = rows.reduce((n, r) => n + exerciseSeconds(r), 0);
  return Math.round(total / 60);
}

/** Seconds for one exercise built to SESSION_DEFAULTS (auto rest). */
const perExerciseSecondsWithDefaults = exerciseSeconds({
  warmupSets: SESSION_DEFAULTS.warmupSets,
  workingSets: SESSION_DEFAULTS.workingSets,
  dropSets: SESSION_DEFAULTS.dropSets,
  restSeconds: null,
});

/** How many default-structured exercises fit a target duration (clamped 2..10). */
export function exerciseCountForMinutes(minutes: number): number {
  const raw = Math.round((minutes * 60) / perExerciseSecondsWithDefaults);
  return Math.max(2, Math.min(10, raw));
}
