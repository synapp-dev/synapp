import { thresholdsAt } from "@/lib/gym/standards";
import type { StandardsRow } from "@/entities/gym/model/types";

// Cold-start calibration. The first time a lift is performed there's no history
// to progress from, so we (a) propose a sensible starting weight from the
// population strength standards + the lifter's bodyweight, (b) read back their
// all-out (AMRAP) set to estimate a 1RM, and (c) guard against a badly
// calibrated set — suggesting a fatigue-aware retry. The derived working weight
// becomes the first history entry, after which the normal double-progression in
// recommend.ts takes over.

/** Plate granularity available on the Force USA G20 (micro plates). */
const PLATE_STEP = 1.25;

/** Aim for roughly this many reps on a benchmark set — squarely in Epley's reliable band. */
export const BENCHMARK_REP_TARGET = 8;

/** Epley est-1RM is only trustworthy in this rep window; outside it we recalibrate. */
const RELIABLE_LOW = 4;
const RELIABLE_HIGH = 12;
/** Clamp reps in the e1RM formula so a wildly light set can't inflate the estimate. */
const E1RM_REP_CAP = 15;

/** Default working rep used to translate an est-1RM back into a working weight. */
const WORKING_REPS = 10;

export function roundToPlate(kg: number, step = PLATE_STEP): number {
  return Math.round(kg / step) * step;
}

/** Invert Epley: the load that should yield `reps` at a given est-1RM. */
export function loadForReps(e1rm: number, reps: number): number {
  return e1rm / (1 + reps / 30);
}

/**
 * Epley est-1RM for one set. Bodyweight movements fold the lifter's bodyweight
 * into the load (the logged weight is the *added* weight — 0 unweighted,
 * negative when assisted). `repCap` clamps reps so an over-light set can't blow
 * the estimate up.
 */
export function setE1rm(params: {
  weight: number | null;
  reps: number | null;
  isBodyweight: boolean;
  bodyweight: number | null;
  repCap?: number;
}): number | null {
  const { weight, reps, isBodyweight, bodyweight, repCap } = params;
  if (reps == null || reps <= 0) return null;
  const load = (isBodyweight ? bodyweight ?? 0 : 0) + (weight ?? 0);
  if (!(load > 0)) return null;
  const r = repCap ? Math.min(reps, repCap) : reps;
  return load * (1 + r / 30);
}

export type BenchmarkProposal = {
  /** Added weight to load (bodyweight moves: total = bodyweight + this; can be ≤0). */
  weight: number | null;
  repTarget: number;
  /** Where the number came from — standards-seeded vs needs the lifter to enter one. */
  basis: "standards" | "ask";
  note: string;
};

/** Propose a first-time benchmark weight from standards + bodyweight. */
export function proposeBenchmark(params: {
  standardsRows: StandardsRow[] | null | undefined;
  bodyweight: number | null;
  isBodyweight: boolean;
  repTarget?: number;
}): BenchmarkProposal {
  const { standardsRows, bodyweight, isBodyweight, repTarget = BENCHMARK_REP_TARGET } = params;
  const th = thresholdsAt(standardsRows, bodyweight ?? 0);
  if (!th) {
    return {
      weight: null,
      repTarget,
      basis: "ask",
      note: `First time on this lift — load a weight you can do for about ${repTarget} clean reps.`,
    };
  }
  // Seed at the beginner 1RM, expressed as a weight for ~repTarget reps.
  const targetLoad = loadForReps(th.beginner, repTarget);
  const added = isBodyweight ? targetLoad - (bodyweight ?? 0) : targetLoad;
  return {
    weight: roundToPlate(added),
    repTarget,
    basis: "standards",
    note: `Starting near a beginner lift for your bodyweight — go all-out, aim ~${repTarget} clean reps.`,
  };
}

export type BenchmarkQuality = "good" | "too_light" | "too_heavy";

export type BenchmarkVerdict = {
  quality: BenchmarkQuality;
  /** Reliability-aware est-1RM (kg total load, incl. bodyweight for bw moves). */
  e1rm: number;
  /** Suggested working weight (added) for the working rep target. */
  workingWeight: number;
  /** When not "good", the suggested retry weight (added); null when good. */
  retryWeight: number | null;
  /** Whether a rest is advised before the retry (the set was taxing). */
  restBeforeRetry: boolean;
  message: string;
};

function toAdded(totalLoad: number, isBodyweight: boolean, bodyweight: number | null): number {
  return roundToPlate(isBodyweight ? totalLoad - (bodyweight ?? 0) : totalLoad);
}

/** Assess a benchmark AMRAP set and derive a working weight (and retry if off). */
export function evaluateBenchmark(params: {
  weight: number | null;
  reps: number | null;
  isBodyweight: boolean;
  bodyweight: number | null;
  workingReps?: number;
}): BenchmarkVerdict | null {
  const { weight, reps, isBodyweight, bodyweight, workingReps = WORKING_REPS } = params;
  if (reps == null || reps <= 0) return null;
  const e1rm = setE1rm({ weight, reps, isBodyweight, bodyweight, repCap: E1RM_REP_CAP });
  if (e1rm == null) return null;

  const workingWeight = toAdded(loadForReps(e1rm, workingReps), isBodyweight, bodyweight);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  if (reps >= RELIABLE_LOW && reps <= RELIABLE_HIGH) {
    return {
      quality: "good",
      e1rm: round1(e1rm),
      workingWeight,
      retryWeight: null,
      restBeforeRetry: false,
      message: `Locked in — working weight ~${workingWeight} kg for ${workingReps} reps.`,
    };
  }

  if (reps > RELIABLE_HIGH) {
    // Too light: aim a retry at ~RELIABLE_HIGH reps. Rest first — the high-rep
    // set is fatiguing and would suppress the retry.
    const retry = toAdded(loadForReps(e1rm, RELIABLE_HIGH), isBodyweight, bodyweight);
    return {
      quality: "too_light",
      e1rm: round1(e1rm),
      workingWeight,
      retryWeight: retry,
      restBeforeRetry: true,
      message: `That was light (${reps} reps). Rest, then try ~${retry} kg for one more benchmark set.`,
    };
  }

  // Too heavy (failed early): aim a retry at ~BENCHMARK_REP_TARGET reps. Low-rep
  // e1RM is fairly reliable, so little fatigue correction is needed.
  const retry = toAdded(loadForReps(e1rm, BENCHMARK_REP_TARGET), isBodyweight, bodyweight);
  return {
    quality: "too_heavy",
    e1rm: round1(e1rm),
    workingWeight,
    retryWeight: retry,
    restBeforeRetry: true,
    message: `Heavy (${reps} reps). Rest, then try ~${retry} kg to dial it in.`,
  };
}

// Re-estimate after a fatigue-affected retry. The prior (badly-calibrated) set
// leaves acute fatigue, so the retry *under*-reports — treat its est-1RM as a
// floor and apply a small, bounded upward correction scaled to how taxing the
// prior set was (its reps-to-failure). We never trust the prior high-rep set's
// own inflated number for the baseline; the cleaner retry, corrected, wins.
const MAX_FATIGUE_CORRECTION = 0.08; // ≤ 8 %
const FATIGUE_PER_REP = 0.003;

export function evaluateRetry(params: {
  retryWeight: number | null;
  retryReps: number | null;
  /** Reps of the taxing first benchmark set (drives the fatigue correction). */
  priorReps: number;
  isBodyweight: boolean;
  bodyweight: number | null;
  workingReps?: number;
}): BenchmarkVerdict | null {
  const { retryWeight, retryReps, priorReps, isBodyweight, bodyweight, workingReps = WORKING_REPS } = params;
  const raw = setE1rm({ weight: retryWeight, reps: retryReps, isBodyweight, bodyweight, repCap: E1RM_REP_CAP });
  if (raw == null) return null;
  const correction = Math.min(MAX_FATIGUE_CORRECTION, Math.max(0, priorReps * FATIGUE_PER_REP));
  const e1rm = raw * (1 + correction);
  const workingWeight = toAdded(loadForReps(e1rm, workingReps), isBodyweight, bodyweight);
  return {
    quality: "good",
    e1rm: Math.round(e1rm * 10) / 10,
    workingWeight,
    retryWeight: null,
    restBeforeRetry: false,
    message: `Locked in (+${Math.round(correction * 100)}% for fatigue) — ~${workingWeight} kg for ${workingReps} reps.`,
  };
}
