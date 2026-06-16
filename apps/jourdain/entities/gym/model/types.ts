// Domain models for the Gym module. Mirrors the shape returned by the gym
// service / API (camelCase), distinct from the snake_case DB rows.

// ── Muscle taxonomy ──────────────────────────────────────────────────────────
// Two levels: a main MuscleGroup owns several MuscleSubgroups. Exercises tag a
// subgroup (primary + secondaries); status is computed per subgroup and rolled
// up to the main group. This is the single source of truth — keep DB checks and
// the body map in sync with it.

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "core",
  "upper_legs",
  "lower_legs",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_SUBGROUPS = [
  // chest
  "chest_upper",
  "chest_middle",
  "chest_lower",
  // back
  "back_lats",
  "back_traps",
  "back_lower",
  // shoulders
  "delts_front",
  "delts_side",
  "delts_rear",
  // arms
  "biceps",
  "triceps",
  "forearms",
  // core
  "abs",
  "obliques",
  "serratus",
  // upper legs
  "quads",
  "hamstrings",
  "glutes",
  "adductors",
  // lower legs
  "calves",
  "tibialis",
] as const;

export type MuscleSubgroup = (typeof MUSCLE_SUBGROUPS)[number];

/** Which main group each subgroup belongs to. */
export const SUBGROUP_TO_GROUP: Record<MuscleSubgroup, MuscleGroup> = {
  chest_upper: "chest",
  chest_middle: "chest",
  chest_lower: "chest",
  back_lats: "back",
  back_traps: "back",
  back_lower: "back",
  delts_front: "shoulders",
  delts_side: "shoulders",
  delts_rear: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abs: "core",
  obliques: "core",
  serratus: "core",
  quads: "upper_legs",
  hamstrings: "upper_legs",
  glutes: "upper_legs",
  adductors: "upper_legs",
  calves: "lower_legs",
  tibialis: "lower_legs",
};

/** Subgroups belonging to each main group, in display order. */
export const GROUP_SUBGROUPS: Record<MuscleGroup, MuscleSubgroup[]> = (() => {
  const out = {
    chest: [],
    back: [],
    shoulders: [],
    arms: [],
    core: [],
    upper_legs: [],
    lower_legs: [],
  } as Record<MuscleGroup, MuscleSubgroup[]>;
  for (const sub of MUSCLE_SUBGROUPS) out[SUBGROUP_TO_GROUP[sub]].push(sub);
  return out;
})();

export function groupOf(subgroup: MuscleSubgroup): MuscleGroup {
  return SUBGROUP_TO_GROUP[subgroup];
}

/** All subgroups belonging to the given main groups, in taxonomy order. */
export function expandGroups(groups: MuscleGroup[]): MuscleSubgroup[] {
  const set = new Set(groups);
  return MUSCLE_SUBGROUPS.filter((s) => set.has(SUBGROUP_TO_GROUP[s]));
}

/** Unique main groups the given subgroups belong to, in display order. */
export function rollupSubgroups(subgroups: MuscleSubgroup[]): MuscleGroup[] {
  const set = new Set(subgroups.map((s) => SUBGROUP_TO_GROUP[s]));
  return MUSCLE_GROUPS.filter((g) => set.has(g));
}

/** Stations available on the Force USA G20 (plus bodyweight). */
export const STATIONS = [
  "cable",
  "smith",
  "lat_pulldown",
  "low_row",
  "leg_press",
  "leg_developer",
  "chin_up",
  "landmine",
  "bench",
  "bodyweight",
] as const;

export type Station = (typeof STATIONS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  upper_legs: "Upper Legs",
  lower_legs: "Lower Legs",
};

export const MUSCLE_SUBGROUP_LABELS: Record<MuscleSubgroup, string> = {
  chest_upper: "Upper Chest",
  chest_middle: "Mid Chest",
  chest_lower: "Lower Chest",
  back_lats: "Lats",
  back_traps: "Traps",
  back_lower: "Lower Back",
  delts_front: "Front Delts",
  delts_side: "Side Delts",
  delts_rear: "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  serratus: "Serratus",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  adductors: "Adductors",
  calves: "Calves",
  tibialis: "Tibialis",
};

export const STATION_LABELS: Record<Station, string> = {
  cable: "Cable",
  smith: "Smith Machine",
  lat_pulldown: "Lat Pulldown",
  low_row: "Low Row",
  leg_press: "Leg Press",
  leg_developer: "Leg Developer",
  chin_up: "Chin-Up",
  landmine: "Landmine",
  bench: "Bench",
  bodyweight: "Bodyweight",
};

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  /** Primary muscle subgroup this exercise trains. */
  subgroup: MuscleSubgroup;
  /** Main group, derived from the primary subgroup. */
  group: MuscleGroup;
  secondarySubgroups: MuscleSubgroup[];
  station: Station;
  /** strengthlevel.com slug this exercise's standards come from (null if none). */
  strengthLevelSlug: string | null;
  isUnilateral: boolean;
  /** Bodyweight movement — its standards are total-weight (bodyweight + added) 1RMs. */
  isBodyweight: boolean;
  /** A "staple" the lifter prefers — smart-fill weights it up. */
  isFavourite: boolean;
  isCustom: boolean;
  archived: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Strength standards (strengthlevel.com) ───────────────────────────────────
export const STRENGTH_LEVELS = [
  "beginner",
  "novice",
  "intermediate",
  "advanced",
  "elite",
] as const;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];
/** A level reached, or "untrained" when below the beginner threshold. */
export type LiftStanding = StrengthLevel | "untrained";
export type Sex = "male" | "female";

/** One standards row: [bodyweight_kg, beginner, novice, intermediate, advanced, elite] (kg). */
export type StandardsRow = [number, number, number, number, number, number];

export type ExerciseStandards = {
  /** strengthlevel slug (the key). */
  slug: string;
  male: StandardsRow[] | null;
  female: StandardsRow[] | null;
  imageUrl: string | null;
  sourceUrl: string | null;
};

export type BodyWeightEntry = {
  id: string;
  /** ISO timestamp of the weigh-in (date + time). */
  measuredAt: string;
  weightKg: number;
  /** Optional smart-scale body-composition readings. */
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  bodyWaterPct: number | null;
  note: string | null;
  source: string;
};

export type LogBodyWeightInput = {
  weightKg: number;
  /** Defaults to now() if omitted. */
  measuredAt?: string;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  bodyWaterPct?: number | null;
  note?: string | null;
};

export type CreateExerciseInput = {
  name: string;
  subgroup: MuscleSubgroup;
  station: Station;
  secondarySubgroups?: MuscleSubgroup[];
  isUnilateral?: boolean;
  notes?: string | null;
};

export type UpdateExerciseInput = {
  name?: string;
  subgroup?: MuscleSubgroup;
  station?: Station;
  secondarySubgroups?: MuscleSubgroup[];
  strengthLevelSlug?: string | null;
  isUnilateral?: boolean;
  isFavourite?: boolean;
  notes?: string | null;
  archived?: boolean;
};

export type ProgramExercise = {
  id: string;
  exerciseId: string;
  name: string;
  subgroup: MuscleSubgroup;
  group: MuscleGroup;
  station: Station;
  orderIndex: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
};

export type Program = {
  id: string;
  name: string;
  dayOfWeek: number | null;
  /** Precise targets chosen for the day (e.g. all chest + triceps for a push day). */
  muscleSubgroups: MuscleSubgroup[];
  /** Derived rollup of muscleSubgroups — kept for compact badge displays. */
  muscleGroups: MuscleGroup[];
  /** Smart programs hold no fixed exercises — the list is generated each start. */
  isSmart: boolean;
  notes: string | null;
  orderIndex: number;
  exercises: ProgramExercise[];
  createdAt: string;
  updatedAt: string;
};

/** One exercise within a program template (used when creating/updating). */
export type ProgramExerciseInput = {
  exerciseId: string;
  targetSets?: number;
  targetRepMin?: number;
  targetRepMax?: number;
};

export type CreateProgramInput = {
  name: string;
  dayOfWeek?: number | null;
  muscleSubgroups?: MuscleSubgroup[];
  /** Back-compat: expanded to subgroups if muscleSubgroups is absent. */
  muscleGroups?: MuscleGroup[];
  isSmart?: boolean;
  notes?: string | null;
  exercises?: ProgramExerciseInput[];
};

export type UpdateProgramInput = {
  name?: string;
  dayOfWeek?: number | null;
  muscleSubgroups?: MuscleSubgroup[];
  muscleGroups?: MuscleGroup[];
  isSmart?: boolean;
  notes?: string | null;
  orderIndex?: number;
  /** When present, replaces the program's ordered exercise list wholesale. */
  exercises?: ProgramExerciseInput[];
};

/** Role of a set in the session structure. */
export type SetKind = "warmup" | "working" | "drop";

export type GymSet = {
  id: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  isWarmup: boolean;
  kind: SetKind;
  completed: boolean;
  createdAt: string;
};

export type SessionExercise = {
  id: string;
  exerciseId: string | null;
  exerciseName: string;
  orderIndex: number;
  targetSets: number | null;
  sets: GymSet[];
};

export type SessionStatus = "active" | "completed";

export type SessionIntensity = "normal" | "hard";

export type Session = {
  id: string;
  programId: string | null;
  /** Routine task this session satisfies (set when started from the schedule). */
  taskId: string | null;
  /** Chosen at start; "hard" biases load suggestions toward bigger jumps / PRs. */
  intensity: SessionIntensity;
  title: string;
  performedOn: string;
  startedAt: string | null;
  endedAt: string | null;
  status: SessionStatus;
  notes: string | null;
  exercises: SessionExercise[];
  createdAt: string;
  updatedAt: string;
};

/** Lightweight session row for lists (no nested exercises/sets). */
export type SessionSummary = {
  id: string;
  programId: string | null;
  title: string;
  performedOn: string;
  status: SessionStatus;
  setCount: number;
  createdAt: string;
};

export type StartSessionInput = {
  programId?: string | null;
  title?: string;
  /** Ad-hoc: start with these exercises instead of a program. */
  exerciseIds?: string[];
  intensity?: SessionIntensity;
};

// ── Weekly schedule (the PPL rotation) ───────────────────────────────────────
/** One weekday's training slot. programId null ⇒ rest day. */
export type ScheduleDay = {
  dayOfWeek: number; // 0=Sun..6=Sat
  programId: string | null;
  programName: string | null;
  muscleGroups: MuscleGroup[];
};

export type GymSchedule = {
  /** Always length 7, indexed by dayOfWeek (0=Sun..6=Sat). */
  days: ScheduleDay[];
  /** The weekly "go to gym" reminder routine, if the user enabled reminders. */
  reminderRoutineId: string | null;
  /** Whether that routine is currently active. */
  reminderActive: boolean;
  /** Reminder time (HH:mm) of the routine, or null if none. */
  reminderTime: string | null;
};

export type LogSetInput = {
  sessionExerciseId: string;
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  kind?: SetKind;
};

export type UpdateSetInput = {
  weight?: number | null;
  reps?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  completed?: boolean;
};

/** A past performance of one exercise, newest sets grouped by session. */
export type ExerciseHistoryEntry = {
  sessionId: string;
  performedOn: string;
  sets: { weight: number | null; reps: number | null; rpe: number | null; isWarmup: boolean }[];
};

/** Aggregated training load for one muscle subgroup over a recent window. */
export type MuscleSummary = {
  subgroup: MuscleSubgroup;
  /** Working sets per week (primary at 1.0, secondary at 0.5). */
  weeklySets: number;
  volume: number;
  lastTrained: string | null;
  /** Best est-1RM per session date, oldest first — drives the strength trend. */
  e1rmSeries: { date: string; value: number }[];
};
