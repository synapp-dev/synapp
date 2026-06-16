import { assessLift, type LiftAssessment } from "@/lib/gym/standards";
import {
  MUSCLE_GROUPS,
  MUSCLE_SUBGROUPS,
  STRENGTH_LEVELS,
  SUBGROUP_TO_GROUP,
  type ExerciseStandards,
  type Exercise,
  type LiftStanding,
  type MuscleGroup,
  type MuscleSubgroup,
  type Sex,
} from "@/entities/gym/model/types";

// Rates each muscle by its STRENGTH against the benchmarks: every exercise gets
// a continuous score from its est-1RM vs its standards (at the lifter's
// bodyweight), and a muscle's score is the average of its exercises' scores.
// untrained = 0, beginner = 1 … elite = 5, plus the partial progress within a band.

export const STANDING_ORDER: LiftStanding[] = ["untrained", ...STRENGTH_LEVELS];

export type MuscleRating = {
  standing: LiftStanding;
  /** Continuous 0–5 average score (or null when nothing's rated). */
  score: number | null;
  /** How many of the muscle's exercises had a usable benchmark + logged lift. */
  rated: number;
  total: number;
};

function liftScore(a: LiftAssessment): number {
  const i = STANDING_ORDER.indexOf(a.standing);
  return i + (a.standing === "elite" ? 0 : a.progressToNext);
}

function standingOfScore(score: number): LiftStanding {
  return STANDING_ORDER[Math.max(0, Math.min(5, Math.round(score)))]!;
}

function rate(scores: number[], total: number): MuscleRating {
  if (scores.length === 0) return { standing: "untrained", score: null, rated: 0, total };
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { standing: standingOfScore(avg), score: avg, rated: scores.length, total };
}

export function rateMuscles({
  exercises,
  standards,
  bests,
  bodyweight,
  sex,
}: {
  exercises: Exercise[];
  standards: Map<string, ExerciseStandards> | undefined;
  bests: Record<string, number> | undefined;
  bodyweight: number | null;
  sex: Sex;
}): {
  bySubgroup: Record<MuscleSubgroup, MuscleRating>;
  byGroup: Record<MuscleGroup, MuscleRating>;
} {
  // Per-exercise strength score (only when it has standards + a logged best).
  const scoreByExercise = new Map<string, number>();
  if (bodyweight && standards && bests) {
    for (const ex of exercises) {
      if (ex.archived) continue;
      const rows = ex.strengthLevelSlug ? standards.get(ex.strengthLevelSlug)?.[sex] : null;
      const best = bests[ex.id];
      if (!rows || best == null) continue;
      const a = assessLift(rows, bodyweight, best);
      if (a) scoreByExercise.set(ex.id, liftScore(a));
    }
  }

  const active = exercises.filter((e) => !e.archived);
  const subScores = new Map<MuscleSubgroup, number[]>();
  const subTotal = new Map<MuscleSubgroup, number>();
  const grpScores = new Map<MuscleGroup, number[]>();
  const grpTotal = new Map<MuscleGroup, number>();
  for (const ex of active) {
    const g = SUBGROUP_TO_GROUP[ex.subgroup];
    subTotal.set(ex.subgroup, (subTotal.get(ex.subgroup) ?? 0) + 1);
    grpTotal.set(g, (grpTotal.get(g) ?? 0) + 1);
    const s = scoreByExercise.get(ex.id);
    if (s == null) continue;
    (subScores.get(ex.subgroup) ?? subScores.set(ex.subgroup, []).get(ex.subgroup)!).push(s);
    (grpScores.get(g) ?? grpScores.set(g, []).get(g)!).push(s);
  }

  const bySubgroup = {} as Record<MuscleSubgroup, MuscleRating>;
  for (const sg of MUSCLE_SUBGROUPS) {
    bySubgroup[sg] = rate(subScores.get(sg) ?? [], subTotal.get(sg) ?? 0);
  }
  const byGroup = {} as Record<MuscleGroup, MuscleRating>;
  for (const g of MUSCLE_GROUPS) {
    byGroup[g] = rate(grpScores.get(g) ?? [], grpTotal.get(g) ?? 0);
  }
  return { bySubgroup, byGroup };
}
