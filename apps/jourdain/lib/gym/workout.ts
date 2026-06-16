import {
  SUBGROUP_TO_GROUP,
  type MuscleGroup,
  type MuscleSubgroup,
  type Station,
} from "@/entities/gym/model/types";

// Push / Pull / Legs session builder. Given a pool of available exercises (the
// user's own library, falling back to the starter catalog), it assembles one
// balanced session for a focus by drawing a few exercises across that focus's
// muscle blocks. Pure and side-effect-free so it's easy to test and reuse.

export const WORKOUT_FOCUSES = ["push", "pull", "legs"] as const;
export type WorkoutFocus = (typeof WORKOUT_FOCUSES)[number];

export const WORKOUT_FOCUS_LABELS: Record<WorkoutFocus, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

export const WORKOUT_FOCUS_TITLES: Record<WorkoutFocus, string> = {
  push: "Push Day",
  pull: "Pull Day",
  legs: "Leg Day",
};

/** The minimal shape the builder needs from an exercise. */
export type WorkoutCandidate = {
  name: string;
  subgroup: MuscleSubgroup;
  station: Station;
  /** Real exercise row id — null when drawn from the starter catalog. */
  exerciseId?: string | null;
  /** strengthlevel.com slug, for the image + strength benchmarks. */
  strengthLevelSlug?: string | null;
};

export type WorkoutExercise = {
  name: string;
  subgroup: MuscleSubgroup;
  group: MuscleGroup;
  station: Station;
  exerciseId: string | null;
  strengthLevelSlug: string | null;
  /** Block this exercise was drawn for, e.g. "Chest". */
  blockLabel: string;
  sets: number;
  repMin: number;
  repMax: number;
};

export type Workout = {
  focus: WorkoutFocus;
  title: string;
  exercises: WorkoutExercise[];
};

// Each focus is a few "blocks" — a labelled bucket of subgroups and how many
// exercises to pull from it. This is what keeps a session balanced (e.g. a push
// day always covers chest, shoulders and triceps) rather than three chest moves.
type Block = { label: string; subgroups: MuscleSubgroup[]; count: number };

const RECIPES: Record<WorkoutFocus, Block[]> = {
  push: [
    {
      label: "Chest",
      subgroups: ["chest_upper", "chest_middle", "chest_lower"],
      count: 2,
    },
    { label: "Shoulders", subgroups: ["delts_front", "delts_side"], count: 1 },
    { label: "Triceps", subgroups: ["triceps"], count: 2 },
  ],
  pull: [
    { label: "Back", subgroups: ["back_lats", "back_traps"], count: 2 },
    { label: "Rear Delts", subgroups: ["delts_rear"], count: 1 },
    { label: "Biceps", subgroups: ["biceps", "forearms"], count: 2 },
  ],
  legs: [
    { label: "Quads", subgroups: ["quads"], count: 2 },
    {
      label: "Hamstrings & Glutes",
      subgroups: ["hamstrings", "glutes"],
      count: 2,
    },
    { label: "Calves", subgroups: ["calves", "tibialis"], count: 1 },
  ],
};

// Compound movements live on these stations — give them more sets at lower reps;
// everything else is treated as accessory work (fewer sets, higher reps).
const COMPOUND_STATIONS: ReadonlySet<Station> = new Set([
  "smith",
  "leg_press",
  "lat_pulldown",
  "low_row",
  "chin_up",
  "landmine",
]);

function repScheme(station: Station): {
  sets: number;
  repMin: number;
  repMax: number;
} {
  return COMPOUND_STATIONS.has(station)
    ? { sets: 4, repMin: 6, repMax: 10 }
    : { sets: 3, repMin: 10, repMax: 15 };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/** Pick a random focus — used when the caller doesn't specify one. */
export function randomFocus(): WorkoutFocus {
  return WORKOUT_FOCUSES[
    Math.floor(Math.random() * WORKOUT_FOCUSES.length)
  ] as WorkoutFocus;
}

/**
 * Build one session for `focus` from `candidates`. Draws the recipe's blocks in
 * order, shuffling within each block for variety, and skips blocks with no
 * matching exercises. Returns null only when nothing in the pool fits the focus.
 */
export function buildWorkout(
  candidates: WorkoutCandidate[],
  focus: WorkoutFocus
): Workout | null {
  const exercises: WorkoutExercise[] = [];
  const used = new Set<string>();

  for (const block of RECIPES[focus]) {
    const pool = shuffle(
      candidates.filter(
        (c) => block.subgroups.includes(c.subgroup) && !used.has(c.name)
      )
    );
    for (const candidate of pool.slice(0, block.count)) {
      used.add(candidate.name);
      const scheme = repScheme(candidate.station);
      exercises.push({
        name: candidate.name,
        subgroup: candidate.subgroup,
        group: SUBGROUP_TO_GROUP[candidate.subgroup],
        station: candidate.station,
        exerciseId: candidate.exerciseId ?? null,
        strengthLevelSlug: candidate.strengthLevelSlug ?? null,
        blockLabel: block.label,
        ...scheme,
      });
    }
  }

  if (exercises.length === 0) return null;

  return { focus, title: WORKOUT_FOCUS_TITLES[focus], exercises };
}
