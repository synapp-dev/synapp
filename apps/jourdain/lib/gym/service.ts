import type { SupabaseClient } from "@supabase/supabase-js";
import { G20_CATALOG } from "@/lib/gym/catalog";
import { thresholdsAt } from "@/lib/gym/standards";
import { createRoutine, updateRoutine } from "@/lib/routines/service";
import { assessSubgroups } from "@/lib/gym/muscle-status";
import { generateSmartSession } from "@/lib/gym/smart-fill";
import {
  SUBGROUP_TO_GROUP,
  expandGroups,
  rollupSubgroups,
  type StrengthLevel,
  type BodyWeightEntry,
  type CreateExerciseInput,
  type CreateProgramInput,
  type Exercise,
  type ExerciseHistoryEntry,
  type ExerciseStandards,
  type StandardsRow,
  type GymSet,
  type LogBodyWeightInput,
  type LogSetInput,
  type MuscleGroup,
  type MuscleSubgroup,
  type MuscleSummary,
  type Program,
  type ProgramExercise,
  type Session,
  type SessionExercise,
  type SessionSummary,
  type StartSessionInput,
  type GymSchedule,
  type Station,
  type UpdateExerciseInput,
  type UpdateProgramInput,
  type UpdateSetInput,
} from "@/entities/gym/model/types";

// ── Row shapes ──────────────────────────────────────────────────────────────
type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  subgroup: MuscleSubgroup;
  secondary_subgroups: MuscleSubgroup[] | null;
  station: Station;
  strength_level_slug: string | null;
  is_unilateral: boolean;
  is_bodyweight: boolean;
  is_favourite: boolean;
  is_custom: boolean;
  archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const EXERCISE_COLUMNS =
  "id, slug, name, subgroup, secondary_subgroups, station, strength_level_slug, is_unilateral, is_bodyweight, is_favourite, is_custom, archived, notes, created_at, updated_at";

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subgroup: row.subgroup,
    group: SUBGROUP_TO_GROUP[row.subgroup],
    secondarySubgroups: row.secondary_subgroups ?? [],
    station: row.station,
    strengthLevelSlug: row.strength_level_slug,
    isUnilateral: row.is_unilateral,
    isBodyweight: row.is_bodyweight,
    isFavourite: row.is_favourite ?? false,
    isCustom: row.is_custom,
    archived: row.archived,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// ── Exercises ────────────────────────────────────────────────────────────────
export async function listExercises(
  supabase: SupabaseClient,
  userId: string,
  filters?: { subgroup?: MuscleSubgroup; station?: Station; includeArchived?: boolean }
): Promise<Exercise[]> {
  let query = supabase
    .from("gym_exercises")
    .select(EXERCISE_COLUMNS)
    .eq("user_id", userId)
    .order("subgroup", { ascending: true })
    .order("name", { ascending: true });

  if (!filters?.includeArchived) query = query.eq("archived", false);
  if (filters?.subgroup) query = query.eq("subgroup", filters.subgroup);
  if (filters?.station) query = query.eq("station", filters.station);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as ExerciseRow[]).map(toExercise);
}

export async function createExercise(
  supabase: SupabaseClient,
  userId: string,
  input: CreateExerciseInput
): Promise<Exercise> {
  const base = slugify(input.name) || "exercise";
  const slug = `custom-${base}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("gym_exercises")
    .insert({
      user_id: userId,
      slug,
      name: input.name,
      subgroup: input.subgroup,
      station: input.station,
      secondary_subgroups: input.secondarySubgroups ?? [],
      is_unilateral: input.isUnilateral ?? false,
      is_custom: true,
      notes: input.notes ?? null,
    })
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toExercise(data as ExerciseRow);
}

export async function updateExercise(
  supabase: SupabaseClient,
  exerciseId: string,
  input: UpdateExerciseInput
): Promise<Exercise> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.subgroup !== undefined) patch.subgroup = input.subgroup;
  if (input.station !== undefined) patch.station = input.station;
  if (input.secondarySubgroups !== undefined) patch.secondary_subgroups = input.secondarySubgroups;
  if (input.strengthLevelSlug !== undefined) patch.strength_level_slug = input.strengthLevelSlug;
  if (input.isUnilateral !== undefined) patch.is_unilateral = input.isUnilateral;
  if (input.isFavourite !== undefined) patch.is_favourite = input.isFavourite;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.archived !== undefined) patch.archived = input.archived;

  const { data, error } = await supabase
    .from("gym_exercises")
    .update(patch)
    .eq("id", exerciseId)
    .select(EXERCISE_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toExercise(data as ExerciseRow);
}

/** Seed (or refresh) the G20 starter catalog for a user. Idempotent on slug:
 *  re-seeding updates existing starter exercises to match the catalog, so catalog
 *  edits propagate. Custom exercises (different slugs) are untouched. Returns the
 *  number of catalog rows upserted. */
export async function seedDefaultExercises(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const rows = G20_CATALOG.map((e) => ({
    user_id: userId,
    slug: e.slug,
    name: e.name,
    subgroup: e.subgroup,
    station: e.station,
    secondary_subgroups: e.secondarySubgroups ?? [],
    strength_level_slug: e.strengthLevelSlug ?? null,
    is_unilateral: e.isUnilateral ?? false,
    is_bodyweight: e.isBodyweight ?? false,
    is_custom: false,
  }));

  const { data, error } = await supabase
    .from("gym_exercises")
    .upsert(rows, { onConflict: "user_id,slug" })
    .select("id");
  if (error) throw new Error(error.message);
  return (data as { id: string }[] | null)?.length ?? 0;
}

// ── Programs ─────────────────────────────────────────────────────────────────
type ProgramRow = {
  id: string;
  name: string;
  day_of_week: number | null;
  muscle_groups: MuscleGroup[] | null;
  muscle_subgroups: MuscleSubgroup[] | null;
  is_smart: boolean;
  notes: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
  gym_program_exercises: ProgramExerciseRow[] | null;
};

type ProgramExerciseRow = {
  id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_rep_min: number;
  target_rep_max: number;
  gym_exercises: { name: string; subgroup: MuscleSubgroup; station: Station } | null;
};

const PROGRAM_SELECT =
  "id, name, day_of_week, muscle_groups, muscle_subgroups, is_smart, notes, order_index, created_at, updated_at, " +
  "gym_program_exercises ( id, exercise_id, order_index, target_sets, target_rep_min, target_rep_max, gym_exercises ( name, subgroup, station ) )";

function toProgramExercise(row: ProgramExerciseRow): ProgramExercise {
  const subgroup = row.gym_exercises?.subgroup ?? "chest_middle";
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    name: row.gym_exercises?.name ?? "Unknown",
    subgroup,
    group: SUBGROUP_TO_GROUP[subgroup],
    station: row.gym_exercises?.station ?? "cable",
    orderIndex: row.order_index,
    targetSets: row.target_sets,
    targetRepMin: row.target_rep_min,
    targetRepMax: row.target_rep_max,
  };
}

function toProgram(row: ProgramRow): Program {
  // Prefer the precise subgroup targets; fall back to expanding the old
  // main-group column for programs created before subgroups existed.
  const subgroups =
    row.muscle_subgroups && row.muscle_subgroups.length > 0
      ? row.muscle_subgroups
      : expandGroups(row.muscle_groups ?? []);
  return {
    id: row.id,
    name: row.name,
    dayOfWeek: row.day_of_week,
    muscleSubgroups: subgroups,
    muscleGroups: rollupSubgroups(subgroups),
    isSmart: row.is_smart ?? false,
    notes: row.notes,
    orderIndex: row.order_index,
    exercises: (row.gym_program_exercises ?? [])
      .map(toProgramExercise)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPrograms(
  supabase: SupabaseClient,
  userId: string
): Promise<Program[]> {
  const { data, error } = await supabase
    .from("gym_programs")
    .select(PROGRAM_SELECT)
    .eq("user_id", userId)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data as unknown as ProgramRow[]).map(toProgram);
}

export async function getProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<Program | null> {
  const { data, error } = await supabase
    .from("gym_programs")
    .select(PROGRAM_SELECT)
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProgram(data as unknown as ProgramRow) : null;
}

async function replaceProgramExercises(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
  exercises: NonNullable<CreateProgramInput["exercises"]>
): Promise<void> {
  await supabase.from("gym_program_exercises").delete().eq("program_id", programId);
  if (exercises.length === 0) return;
  const rows = exercises.map((e, i) => ({
    user_id: userId,
    program_id: programId,
    exercise_id: e.exerciseId,
    order_index: i,
    target_sets: e.targetSets ?? 3,
    target_rep_min: e.targetRepMin ?? 8,
    target_rep_max: e.targetRepMax ?? 12,
  }));
  const { error } = await supabase.from("gym_program_exercises").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createProgram(
  supabase: SupabaseClient,
  userId: string,
  input: CreateProgramInput
): Promise<Program> {
  const subgroups =
    input.muscleSubgroups ?? (input.muscleGroups ? expandGroups(input.muscleGroups) : []);
  const { data, error } = await supabase
    .from("gym_programs")
    .insert({
      user_id: userId,
      name: input.name,
      day_of_week: input.dayOfWeek ?? null,
      muscle_subgroups: subgroups,
      muscle_groups: rollupSubgroups(subgroups),
      is_smart: input.isSmart ?? false,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const programId = (data as { id: string }).id;

  if (input.exercises && input.exercises.length > 0) {
    await replaceProgramExercises(supabase, userId, programId, input.exercises);
  }
  const program = await getProgram(supabase, programId);
  if (!program) throw new Error("Failed to load created program");
  return program;
}

export async function updateProgram(
  supabase: SupabaseClient,
  userId: string,
  programId: string,
  input: UpdateProgramInput
): Promise<Program> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.dayOfWeek !== undefined) patch.day_of_week = input.dayOfWeek;
  if (input.muscleSubgroups !== undefined) {
    patch.muscle_subgroups = input.muscleSubgroups;
    patch.muscle_groups = rollupSubgroups(input.muscleSubgroups);
  } else if (input.muscleGroups !== undefined) {
    patch.muscle_subgroups = expandGroups(input.muscleGroups);
    patch.muscle_groups = input.muscleGroups;
  }
  if (input.isSmart !== undefined) patch.is_smart = input.isSmart;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.orderIndex !== undefined) patch.order_index = input.orderIndex;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase
      .from("gym_programs")
      .update(patch)
      .eq("id", programId);
    if (error) throw new Error(error.message);
  }

  if (input.exercises !== undefined) {
    await replaceProgramExercises(supabase, userId, programId, input.exercises);
  }

  const program = await getProgram(supabase, programId);
  if (!program) throw new Error("Program not found");
  return program;
}

export async function deleteProgram(
  supabase: SupabaseClient,
  programId: string
): Promise<void> {
  const { error } = await supabase.from("gym_programs").delete().eq("id", programId);
  if (error) throw new Error(error.message);
}

// ── Sessions ─────────────────────────────────────────────────────────────────
type SetRow = {
  id: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  is_warmup: boolean;
  kind: "warmup" | "working" | "drop" | null;
  completed: boolean;
  created_at: string;
};

type SessionExerciseRow = {
  id: string;
  exercise_id: string | null;
  exercise_name: string;
  order_index: number;
  target_sets: number | null;
  gym_sets: SetRow[] | null;
};

type SessionRow = {
  id: string;
  program_id: string | null;
  task_id: string | null;
  intensity: "normal" | "hard" | null;
  title: string;
  performed_on: string;
  started_at: string | null;
  ended_at: string | null;
  status: "active" | "completed";
  notes: string | null;
  created_at: string;
  updated_at: string;
  gym_session_exercises: SessionExerciseRow[] | null;
};

const SESSION_SELECT =
  "id, program_id, task_id, intensity, title, performed_on, started_at, ended_at, status, notes, created_at, updated_at, " +
  "gym_session_exercises ( id, exercise_id, exercise_name, order_index, target_sets, gym_sets ( id, set_index, weight, reps, rpe, is_warmup, kind, completed, created_at ) )";

function toSet(row: SetRow): GymSet {
  return {
    id: row.id,
    setIndex: row.set_index,
    weight: row.weight != null ? Number(row.weight) : null,
    reps: row.reps,
    rpe: row.rpe != null ? Number(row.rpe) : null,
    isWarmup: row.is_warmup,
    kind: row.kind ?? (row.is_warmup ? "warmup" : "working"),
    completed: row.completed,
    createdAt: row.created_at,
  };
}

function toSessionExercise(row: SessionExerciseRow): SessionExercise {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    orderIndex: row.order_index,
    targetSets: row.target_sets,
    sets: (row.gym_sets ?? []).map(toSet).sort((a, b) => a.setIndex - b.setIndex),
  };
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    programId: row.program_id,
    taskId: row.task_id,
    intensity: row.intensity ?? "normal",
    title: row.title,
    performedOn: row.performed_on,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status,
    notes: row.notes,
    exercises: (row.gym_session_exercises ?? [])
      .map(toSessionExercise)
      .sort((a, b) => a.orderIndex - b.orderIndex),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from("gym_sessions")
    .select(
      "id, program_id, title, performed_on, status, created_at, gym_session_exercises ( gym_sets ( id ) )"
    )
    .eq("user_id", userId)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (
    (data as unknown as (Record<string, unknown> & {
      gym_session_exercises: { gym_sets: { id: string }[] | null }[] | null;
    })[]) ?? []
  ).map((row) => ({
    id: row.id as string,
    programId: (row.program_id as string | null) ?? null,
    title: row.title as string,
    performedOn: row.performed_on as string,
    status: row.status as "active" | "completed",
    setCount: (row.gym_session_exercises ?? []).reduce(
      (n, se) => n + (se.gym_sets?.length ?? 0),
      0
    ),
    createdAt: row.created_at as string,
  }));
}

export async function getSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<Session | null> {
  const { data, error } = await supabase
    .from("gym_sessions")
    .select(SESSION_SELECT)
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toSession(data as unknown as SessionRow) : null;
}

/** Find an active session (one in progress) for the user, if any. */
export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<Session | null> {
  const { data, error } = await supabase
    .from("gym_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return getSession(supabase, (data as { id: string }).id);
}

/**
 * Build a smart program's exercise list at start: prioritise the lagging
 * subgroups inside the program's chosen muscle groups, rotating away from what
 * was done in its last couple of sessions. Falls back to empty if the library
 * has nothing for those groups.
 */
async function generateSmartSeed(
  supabase: SupabaseClient,
  userId: string,
  program: Program
): Promise<{ exerciseId: string; name: string; targetSets: number | null }[]> {
  const [exercises, summaries, recent] = await Promise.all([
    listExercises(supabase, userId),
    getMuscleSummary(supabase, userId),
    supabase
      .from("gym_sessions")
      .select("gym_session_exercises ( exercise_id )")
      .eq("user_id", userId)
      .eq("program_id", program.id)
      .order("performed_on", { ascending: false })
      .limit(2),
  ]);

  const recentIds = (
    (recent.data as { gym_session_exercises: { exercise_id: string | null }[] | null }[] | null) ?? []
  ).flatMap((s) => (s.gym_session_exercises ?? []).map((e) => e.exercise_id).filter(Boolean) as string[]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const assessments = assessSubgroups(summaries, todayISO);
  const picks = generateSmartSession({
    subgroups: program.muscleSubgroups,
    exercises,
    assessments,
    recentExerciseIds: recentIds,
  });

  const byId = new Map(exercises.map((e) => [e.id, e]));
  return picks.map((p) => ({
    exerciseId: p.exerciseId,
    name: byId.get(p.exerciseId)?.name ?? "Exercise",
    targetSets: p.targetSets,
  }));
}

export async function startSession(
  supabase: SupabaseClient,
  userId: string,
  input: StartSessionInput
): Promise<Session> {
  let title = input.title?.trim() || "Workout";
  let seedExercises: { exerciseId: string; name: string; targetSets: number | null }[] = [];

  if (input.programId) {
    const program = await getProgram(supabase, input.programId);
    if (program) {
      title = input.title?.trim() || program.name;
      seedExercises = program.isSmart
        ? await generateSmartSeed(supabase, userId, program)
        : program.exercises.map((e) => ({
            exerciseId: e.exerciseId,
            name: e.name,
            targetSets: e.targetSets,
          }));
    }
  } else if (input.exerciseIds && input.exerciseIds.length > 0) {
    const { data } = await supabase
      .from("gym_exercises")
      .select("id, name")
      .in("id", input.exerciseIds);
    const byId = new Map(
      ((data as { id: string; name: string }[] | null) ?? []).map((r) => [r.id, r.name])
    );
    seedExercises = input.exerciseIds.map((id) => ({
      exerciseId: id,
      name: byId.get(id) ?? "Exercise",
      targetSets: 3,
    }));
  }

  const nowIso = new Date().toISOString();
  const { data: sessionData, error } = await supabase
    .from("gym_sessions")
    .insert({
      user_id: userId,
      program_id: input.programId ?? null,
      title,
      started_at: nowIso,
      status: "active",
      intensity: input.intensity ?? "normal",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const sessionId = (sessionData as { id: string }).id;

  if (seedExercises.length > 0) {
    const rows = seedExercises.map((e, i) => ({
      user_id: userId,
      session_id: sessionId,
      exercise_id: e.exerciseId,
      exercise_name: e.name,
      order_index: i,
      target_sets: e.targetSets,
    }));
    const { error: seErr } = await supabase.from("gym_session_exercises").insert(rows);
    if (seErr) throw new Error(seErr.message);
  }

  const session = await getSession(supabase, sessionId);
  if (!session) throw new Error("Failed to load created session");
  return session;
}

export async function updateSession(
  supabase: SupabaseClient,
  sessionId: string,
  input: { status?: "active" | "completed"; notes?: string | null; title?: string }
): Promise<Session> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.status !== undefined) {
    patch.status = input.status;
    patch.ended_at = input.status === "completed" ? new Date().toISOString() : null;
  }
  const { error } = await supabase.from("gym_sessions").update(patch).eq("id", sessionId);
  if (error) throw new Error(error.message);

  // Finishing a workout ticks off that day's training task (the accountability
  // axis), so it flows into the routine completions / scoring.
  if (input.status === "completed") {
    await linkSessionToTrainingTask(supabase, sessionId);
  }

  const session = await getSession(supabase, sessionId);
  if (!session) throw new Error("Session not found");
  return session;
}

/**
 * Tie a just-completed session to the gym routine's task for that date and mark
 * the task done. No-op when the user hasn't enabled training reminders or there
 * is no open task for the day. Idempotent: re-completing keeps the same link.
 */
async function linkSessionToTrainingTask(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { data: sess } = await supabase
    .from("gym_sessions")
    .select("user_id, performed_on, task_id")
    .eq("id", sessionId)
    .maybeSingle();
  const session = sess as { user_id: string; performed_on: string; task_id: string | null } | null;
  if (!session) return;

  let taskId = session.task_id;
  if (!taskId) {
    const { data: prefs } = await supabase
      .from("gym_preferences")
      .select("routine_id")
      .eq("user_id", session.user_id)
      .maybeSingle();
    const routineId = (prefs as { routine_id: string | null } | null)?.routine_id ?? null;
    if (!routineId) return;

    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("routine_id", routineId)
      .eq("occurrence_date", session.performed_on)
      .neq("status", "done")
      .maybeSingle();
    taskId = (task as { id: string } | null)?.id ?? null;
    if (!taskId) return;

    await supabase.from("gym_sessions").update({ task_id: taskId }).eq("id", sessionId);
  }

  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .neq("status", "done");
}

export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase.from("gym_sessions").delete().eq("id", sessionId);
  if (error) throw new Error(error.message);
}

export async function addSessionExercise(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  exerciseId: string
): Promise<Session> {
  const { data: ex } = await supabase
    .from("gym_exercises")
    .select("name")
    .eq("id", exerciseId)
    .maybeSingle();
  const { count } = await supabase
    .from("gym_session_exercises")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  const { error } = await supabase.from("gym_session_exercises").insert({
    user_id: userId,
    session_id: sessionId,
    exercise_id: exerciseId,
    exercise_name: (ex as { name: string } | null)?.name ?? "Exercise",
    order_index: count ?? 0,
    target_sets: 3,
  });
  if (error) throw new Error(error.message);
  const session = await getSession(supabase, sessionId);
  if (!session) throw new Error("Session not found");
  return session;
}

// ── Sets ─────────────────────────────────────────────────────────────────────
const SET_COLUMNS =
  "id, set_index, weight, reps, rpe, is_warmup, kind, completed, created_at";

export async function logSet(
  supabase: SupabaseClient,
  userId: string,
  input: LogSetInput
): Promise<GymSet> {
  const { count } = await supabase
    .from("gym_sets")
    .select("id", { count: "exact", head: true })
    .eq("session_exercise_id", input.sessionExerciseId);

  const kind = input.kind ?? (input.isWarmup ? "warmup" : "working");
  const { data, error } = await supabase
    .from("gym_sets")
    .insert({
      user_id: userId,
      session_exercise_id: input.sessionExerciseId,
      set_index: (count ?? 0) + 1,
      weight: input.weight ?? null,
      reps: input.reps ?? null,
      rpe: input.rpe ?? null,
      is_warmup: kind === "warmup",
      kind,
    })
    .select(SET_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toSet(data as SetRow);
}

export async function updateSet(
  supabase: SupabaseClient,
  setId: string,
  input: UpdateSetInput
): Promise<GymSet> {
  const patch: Record<string, unknown> = {};
  if (input.weight !== undefined) patch.weight = input.weight;
  if (input.reps !== undefined) patch.reps = input.reps;
  if (input.rpe !== undefined) patch.rpe = input.rpe;
  if (input.isWarmup !== undefined) patch.is_warmup = input.isWarmup;
  if (input.completed !== undefined) patch.completed = input.completed;

  const { data, error } = await supabase
    .from("gym_sets")
    .update(patch)
    .eq("id", setId)
    .select(SET_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toSet(data as SetRow);
}

export async function deleteSet(
  supabase: SupabaseClient,
  setId: string
): Promise<void> {
  const { error } = await supabase.from("gym_sets").delete().eq("id", setId);
  if (error) throw new Error(error.message);
}

// ── History (for charts + recommendations) ────────────────────────────────────
export async function getExerciseHistory(
  supabase: SupabaseClient,
  userId: string,
  exerciseId: string,
  limit = 30
): Promise<ExerciseHistoryEntry[]> {
  const { data, error } = await supabase
    .from("gym_session_exercises")
    .select(
      "id, session_id, gym_sessions!inner ( performed_on, status ), gym_sets ( weight, reps, rpe, is_warmup, set_index )"
    )
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows =
    (data as unknown as {
      session_id: string;
      gym_sessions: { performed_on: string; status: string } | null;
      gym_sets:
        | { weight: number | null; reps: number | null; rpe: number | null; is_warmup: boolean; set_index: number }[]
        | null;
    }[]) ?? [];

  return rows
    .filter((r) => (r.gym_sets?.length ?? 0) > 0)
    .map((r) => ({
      sessionId: r.session_id,
      performedOn: r.gym_sessions?.performed_on ?? "",
      sets: (r.gym_sets ?? [])
        .slice()
        .sort((a, b) => a.set_index - b.set_index)
        .map((s) => ({
          weight: s.weight != null ? Number(s.weight) : null,
          reps: s.reps,
          rpe: s.rpe != null ? Number(s.rpe) : null,
          isWarmup: s.is_warmup,
        })),
    }))
    .sort((a, b) => (a.performedOn < b.performedOn ? 1 : -1));
}

/**
 * Roll up logged sets per muscle group over a recent window. Primary muscle
 * gets full credit; each secondary muscle gets half. Used to drive the body
 * map and the per-muscle training-status assessment.
 */
export async function getMuscleSummary(
  supabase: SupabaseClient,
  userId: string,
  windowDays = 28
): Promise<MuscleSummary[]> {
  const { data, error } = await supabase
    .from("gym_session_exercises")
    .select(
      "gym_exercises ( subgroup, secondary_subgroups ), gym_sessions ( performed_on ), gym_sets ( weight, reps, is_warmup )"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows =
    (data as unknown as {
      gym_exercises: { subgroup: MuscleSubgroup; secondary_subgroups: MuscleSubgroup[] | null } | null;
      gym_sessions: { performed_on: string } | null;
      gym_sets: { weight: number | null; reps: number | null; is_warmup: boolean }[] | null;
    }[]) ?? [];

  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString().slice(0, 10);

  type Agg = { setsWeighted: number; volume: number; lastTrained: string | null; series: Map<string, number> };
  const map = new Map<MuscleSubgroup, Agg>();
  const ensure = (m: MuscleSubgroup): Agg => {
    let agg = map.get(m);
    if (!agg) {
      agg = { setsWeighted: 0, volume: 0, lastTrained: null, series: new Map() };
      map.set(m, agg);
    }
    return agg;
  };

  for (const r of rows) {
    const ex = r.gym_exercises;
    const performedOn = r.gym_sessions?.performed_on;
    if (!ex || !performedOn || performedOn < since) continue;

    const work = (r.gym_sets ?? []).filter(
      (s) => !s.is_warmup && s.weight != null && s.reps != null
    );
    if (work.length === 0) continue;

    const setCount = work.length;
    const volume = work.reduce((n, s) => n + (s.weight as number) * (s.reps as number), 0);
    const bestE1rm = Math.max(
      ...work.map((s) => (s.weight as number) * (1 + (s.reps as number) / 30))
    );

    const primary = ensure(ex.subgroup);
    primary.setsWeighted += setCount;
    primary.volume += volume;
    if (!primary.lastTrained || performedOn > primary.lastTrained) primary.lastTrained = performedOn;
    const best = primary.series.get(performedOn);
    if (best == null || bestE1rm > best) primary.series.set(performedOn, bestE1rm);

    for (const sec of ex.secondary_subgroups ?? []) {
      const agg = ensure(sec);
      agg.setsWeighted += setCount * 0.5;
      agg.volume += volume * 0.5;
      if (!agg.lastTrained || performedOn > agg.lastTrained) agg.lastTrained = performedOn;
    }
  }

  const weeks = Math.max(1, windowDays / 7);
  return [...map.entries()].map(([subgroup, agg]) => ({
    subgroup,
    weeklySets: Math.round((agg.setsWeighted / weeks) * 10) / 10,
    volume: Math.round(agg.volume),
    lastTrained: agg.lastTrained,
    e1rmSeries: [...agg.series.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 })),
  }));
}

// ── Strength standards (global reference) + bodyweight log ───────────────────
type StandardsRowDb = {
  strength_level_slug: string;
  male: StandardsRow[] | null;
  female: StandardsRow[] | null;
  image_path: string | null;
  source_url: string | null;
};

/** All strength-standards rows (keyed by strengthlevel slug). */
export async function getAllStandards(
  supabase: SupabaseClient
): Promise<ExerciseStandards[]> {
  const { data, error } = await supabase
    .from("gym_exercise_standards")
    .select("strength_level_slug, male, female, image_path, source_url");
  if (error) throw new Error(error.message);
  return ((data as StandardsRowDb[] | null) ?? []).map((r) => ({
    slug: r.strength_level_slug,
    male: r.male,
    female: r.female,
    imageUrl: r.image_path,
    sourceUrl: r.source_url,
  }));
}

type BodyWeightRow = {
  id: string;
  measured_at: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  body_water_pct: number | null;
  note: string | null;
  source: string;
};

const BODY_WEIGHT_COLUMNS =
  "id, measured_at, weight_kg, body_fat_pct, muscle_mass_kg, body_water_pct, note, source";

function toBodyWeight(row: BodyWeightRow): BodyWeightEntry {
  return {
    id: row.id,
    measuredAt: row.measured_at,
    weightKg: Number(row.weight_kg),
    bodyFatPct: row.body_fat_pct != null ? Number(row.body_fat_pct) : null,
    muscleMassKg: row.muscle_mass_kg != null ? Number(row.muscle_mass_kg) : null,
    bodyWaterPct: row.body_water_pct != null ? Number(row.body_water_pct) : null,
    note: row.note,
    source: row.source,
  };
}

/** Bodyweight / body-composition log, most-recent first. */
export async function listBodyWeights(
  supabase: SupabaseClient,
  userId: string,
  limit = 180
): Promise<BodyWeightEntry[]> {
  const { data, error } = await supabase
    .from("body_weights")
    .select(BODY_WEIGHT_COLUMNS)
    .eq("user_id", userId)
    .order("measured_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return ((data as BodyWeightRow[] | null) ?? []).map(toBodyWeight);
}

/** Record a weigh-in. */
export async function logBodyWeight(
  supabase: SupabaseClient,
  userId: string,
  input: LogBodyWeightInput
): Promise<BodyWeightEntry> {
  const { data, error } = await supabase
    .from("body_weights")
    .insert({
      user_id: userId,
      measured_at: input.measuredAt ?? new Date().toISOString(),
      weight_kg: input.weightKg,
      body_fat_pct: input.bodyFatPct ?? null,
      muscle_mass_kg: input.muscleMassKg ?? null,
      body_water_pct: input.bodyWaterPct ?? null,
      note: input.note ?? null,
    })
    .select(BODY_WEIGHT_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toBodyWeight(data as BodyWeightRow);
}

// ── Demo data (tagged for one-click teardown) ────────────────────────────────
const DEMO_TAG = "[demo]";
const DEMO_SOURCE = "demo";

// Fallback est-1RM (kg) targets for exercises without strengthlevel standards.
const DEMO_FALLBACK_E1RM: Partial<Record<MuscleSubgroup, number>> = {
  quads: 150, hamstrings: 110, glutes: 130, adductors: 55,
  calves: 110, tibialis: 35, back_lats: 90, back_traps: 80, back_lower: 100,
  chest_upper: 75, chest_middle: 90, chest_lower: 80,
  delts_front: 55, delts_side: 18, delts_rear: 16,
  biceps: 40, triceps: 45, forearms: 35,
  abs: 45, obliques: 35, serratus: 25,
};

// Per-exercise overrides (by catalog slug) pinning the final-week best est-1RM
// (kg) for the demo, regardless of strength-level bands.
const DEMO_TARGET_E1RM_BY_SLUG: Record<string, number> = {
  "smith-bench-press": 85,
  "smith-standing-calf-raise": 210,
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Remove all generated demo sessions and the demo bodyweight. */
export async function clearDemoData(supabase: SupabaseClient, userId: string): Promise<void> {
  const s = await supabase.from("gym_sessions").delete().eq("user_id", userId).eq("notes", DEMO_TAG);
  if (s.error) throw new Error(s.error.message);
  const b = await supabase.from("body_weights").delete().eq("user_id", userId).eq("source", DEMO_SOURCE);
  if (b.error) throw new Error(b.error.message);
}

/**
 * Populate ~4 weeks of completed, progressively-loaded sets across the whole
 * library — every muscle group trained weekly — plus a demo bodyweight so the
 * strength benchmarks resolve. Idempotent: clears any prior demo first.
 */
export async function generateDemoData(supabase: SupabaseClient, userId: string): Promise<number> {
  await clearDemoData(supabase, userId);

  const exercises = await listExercises(supabase, userId);
  if (exercises.length === 0) return 0;
  const standards = await getAllStandards(supabase);
  const stdMap = new Map(standards.map((s) => [s.slug, s]));

  // Use the real logged bodyweight if there is one (so levels stay accurate);
  // otherwise drop in a demo weight so the benchmarks can resolve.
  const existingBw = await listBodyWeights(supabase, userId, 1);
  const BW = existingBw[0]?.weightKg ?? 82.5;
  if (existingBw.length === 0) {
    await supabase.from("body_weights").insert({
      user_id: userId,
      weight_kg: BW,
      source: DEMO_SOURCE,
      measured_at: new Date().toISOString(),
    });
  }

  const WEEKS = 13; // ~3 months of history
  const PER_WEEK = 3; // 3 training days/week
  const today = new Date();
  const isoDate = (daysAgo: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  // Per-exercise progression as a fraction of the current number: START_FRAC at
  // the start of the span, climbing to 1.0 at the most-recent week. Built from
  // weekly increments that vary deterministically per exercise — most weeks make
  // normal progress, ~1 in 4 stalls (a plateau), and the odd week is a
  // breakthrough — with earlier increments weighted heavier (newbie gains). The
  // series is monotonic, so the latest week is always the peak and the headline
  // best lands exactly on the target.
  const START_FRAC = 0.62;
  const fracCache = new Map<string, number[]>();
  const fracSeries = (ex: Exercise): number[] => {
    const cached = fracCache.get(ex.id);
    if (cached) return cached;
    const gains: number[] = [];
    for (let i = 0; i < WEEKS - 1; i++) {
      const r = (hashStr(`${ex.id}#${i}`) % 1000) / 1000; // 0..1, stable per week
      let g: number;
      if (r < 0.25) g = 0.05; // plateau — barely moves this week
      else if (r > 0.88) g = 2.6; // breakthrough week
      else g = 0.7 + r; // normal progress
      g *= 1 + 0.6 * (1 - i / (WEEKS - 1)); // newbie gains up front
      gains.push(g);
    }
    const cum = [0];
    for (let i = 0; i < gains.length; i++) cum.push(cum[i]! + gains[i]!);
    const total = cum[cum.length - 1]! || 1;
    const series = cum.map((c) => START_FRAC + (1 - START_FRAC) * (c / total));
    fracCache.set(ex.id, series);
    return series;
  };

  // The exercise's current (final-week) target est-1RM, before progression.
  const finalE1rm = (ex: Exercise): number => {
    const target = DEMO_TARGET_E1RM_BY_SLUG[ex.slug];
    if (target != null) return target;
    const rows = ex.strengthLevelSlug ? stdMap.get(ex.strengthLevelSlug)?.male : null;
    const th = rows ? thresholdsAt(rows, BW) : null;
    if (th) {
      // Skewed hard toward the lower end so the demo reads like a new lifter:
      // mostly beginner, a little novice.
      const bands: StrengthLevel[] = [
        "beginner", "beginner", "beginner", "beginner", "beginner",
        "novice", "novice",
      ];
      const band = bands[hashStr(ex.id) % bands.length] as StrengthLevel;
      const next: StrengthLevel =
        band === "beginner" ? "novice" : band === "novice" ? "intermediate" : "advanced";
      // Land low within the band so most muscles read at-band, not just-below-next.
      return th[band] + (th[next] - th[band]) * 0.25;
    }
    return DEMO_FALLBACK_E1RM[ex.subgroup] ?? 30;
  };

  const weightFor = (ex: Exercise, week: number): number => {
    // Top set is 10 reps, so est-1RM = load * (1 + 10/30). Back out the load so
    // the final-week best lands exactly on the target; round to 1.25 kg (micro
    // plates) which also gives a realistic stair-step rather than a smooth ramp.
    // Bodyweight moves log the *added* weight, so subtract bodyweight from the
    // load (negative ⇒ assisted); don't clamp those to a positive minimum.
    const e1rm = finalE1rm(ex) * (fracSeries(ex)[week] ?? 1);
    const load = e1rm / (1 + 10 / 30);
    const w = ex.isBodyweight ? load - BW : load;
    const rounded = Math.round(w / 1.25) * 1.25;
    return ex.isBodyweight ? rounded : Math.max(1.25, rounded);
  };

  const sessionRows: Record<string, unknown>[] = [];
  const sessionMeta: { week: number; bucket: number }[] = [];
  for (let w = 0; w < WEEKS; w++) {
    for (let b = 0; b < PER_WEEK; b++) {
      const daysAgo = (WEEKS - 1 - w) * 7 + (PER_WEEK - 1 - b) * 2;
      const date = isoDate(daysAgo);
      sessionRows.push({
        user_id: userId,
        title: `Demo · week ${w + 1} day ${b + 1}`,
        performed_on: date,
        started_at: `${date}T18:00:00Z`,
        ended_at: `${date}T19:05:00Z`,
        status: "completed",
        notes: DEMO_TAG,
      });
      sessionMeta.push({ week: w, bucket: b });
    }
  }
  const sIns = await supabase.from("gym_sessions").insert(sessionRows).select("id");
  if (sIns.error) throw new Error(sIns.error.message);
  const sessions = sIns.data as { id: string }[];

  const seRows: Record<string, unknown>[] = [];
  const seMeta: { ex: Exercise; week: number }[] = [];
  sessions.forEach((s, i) => {
    const { week, bucket } = sessionMeta[i]!;
    const exs = exercises.filter((_, idx) => idx % PER_WEEK === bucket);
    exs.forEach((ex, oi) => {
      seRows.push({
        user_id: userId,
        session_id: s.id,
        exercise_id: ex.id,
        exercise_name: ex.name,
        order_index: oi,
        target_sets: 3,
      });
      seMeta.push({ ex, week });
    });
  });
  const seIns = await supabase.from("gym_session_exercises").insert(seRows).select("id");
  if (seIns.error) throw new Error(seIns.error.message);
  const ses = seIns.data as { id: string }[];

  const setRows: Record<string, unknown>[] = [];
  ses.forEach((se, i) => {
    const { ex, week } = seMeta[i]!;
    const w = weightFor(ex, week);
    [10, 9, 8].forEach((reps, si) => {
      setRows.push({
        user_id: userId,
        session_exercise_id: se.id,
        set_index: si,
        weight: w,
        reps,
        rpe: 7 + si,
        is_warmup: false,
        completed: true,
      });
    });
  });
  const setIns = await supabase.from("gym_sets").insert(setRows);
  if (setIns.error) throw new Error(setIns.error.message);

  return setRows.length;
}

// ── Schedule (weekday → program) + training reminder ─────────────────────────
const GYM_ROUTINE_TITLE = "Gym";
const DEFAULT_REMIND_TIME = "17:00";

type ScheduleRow = {
  day_of_week: number;
  program_id: string;
  gym_programs: { name: string; muscle_groups: MuscleGroup[] | null } | null;
};

/** Read the 7-day schedule plus the training-reminder routine state. */
export async function getSchedule(
  supabase: SupabaseClient,
  userId: string
): Promise<GymSchedule> {
  const [{ data: rows, error }, prefs] = await Promise.all([
    supabase
      .from("gym_schedule")
      .select("day_of_week, program_id, gym_programs ( name, muscle_groups )")
      .eq("user_id", userId),
    getReminderRoutine(supabase, userId),
  ]);
  if (error) throw new Error(error.message);

  const byDay = new Map<number, ScheduleRow>(
    ((rows as unknown as ScheduleRow[]) ?? []).map((r) => [r.day_of_week, r])
  );

  const days = Array.from({ length: 7 }, (_, dow) => {
    const row = byDay.get(dow);
    return {
      dayOfWeek: dow,
      programId: row?.program_id ?? null,
      programName: row?.gym_programs?.name ?? null,
      muscleGroups: row?.gym_programs?.muscle_groups ?? [],
    };
  });

  return {
    days,
    reminderRoutineId: prefs?.id ?? null,
    reminderActive: prefs?.active ?? false,
    reminderTime: prefs?.remindTime ?? null,
  };
}

/** Resolve the user's gym reminder routine via gym_preferences (if any). */
async function getReminderRoutine(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; active: boolean; remindTime: string } | null> {
  const { data: prefs } = await supabase
    .from("gym_preferences")
    .select("routine_id")
    .eq("user_id", userId)
    .maybeSingle();
  const routineId = (prefs as { routine_id: string | null } | null)?.routine_id ?? null;
  if (!routineId) return null;

  const { data: routine } = await supabase
    .from("routines")
    .select("id, active, remind_time")
    .eq("id", routineId)
    .maybeSingle();
  const r = routine as { id: string; active: boolean; remind_time: string } | null;
  if (!r) return null;
  return { id: r.id, active: r.active, remindTime: r.remind_time.slice(0, 5) };
}

/** Assign (or clear, when programId is null) one weekday's program. */
export async function setScheduleDay(
  supabase: SupabaseClient,
  userId: string,
  dayOfWeek: number,
  programId: string | null
): Promise<GymSchedule> {
  if (programId === null) {
    const { error } = await supabase
      .from("gym_schedule")
      .delete()
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("gym_schedule")
      .upsert(
        { user_id: userId, day_of_week: dayOfWeek, program_id: programId },
        { onConflict: "user_id,day_of_week" }
      );
    if (error) throw new Error(error.message);
  }

  // Keep the reminder routine's days in sync with the training days.
  await syncReminderDays(supabase, userId);
  return getSchedule(supabase, userId);
}

/** Weekdays (0..6) that have a program assigned, ascending. */
async function trainingDays(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from("gym_schedule")
    .select("day_of_week")
    .eq("user_id", userId)
    .order("day_of_week", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data as { day_of_week: number }[] | null) ?? []).map((r) => r.day_of_week);
}

/** If a reminder routine exists, repoint it at the current training days. */
async function syncReminderDays(supabase: SupabaseClient, userId: string): Promise<void> {
  const routine = await getReminderRoutine(supabase, userId);
  if (!routine) return;
  const days = await trainingDays(supabase, userId);
  await updateRoutine(supabase, routine.id, { daysOfWeek: days });
}

/**
 * Enable or disable the weekly "go to gym" reminder. Enabling creates the
 * routine (weekly, on the scheduled training days) the first time and stores it
 * in gym_preferences; disabling just deactivates it (kept so re-enabling is
 * cheap and history is preserved).
 */
export async function setTrainingReminder(
  supabase: SupabaseClient,
  userId: string,
  input: { enabled: boolean; remindTime?: string }
): Promise<GymSchedule> {
  const existing = await getReminderRoutine(supabase, userId);
  const days = await trainingDays(supabase, userId);

  if (existing) {
    await updateRoutine(supabase, existing.id, {
      active: input.enabled,
      daysOfWeek: days,
      ...(input.remindTime ? { remindTime: input.remindTime } : {}),
    });
  } else if (input.enabled) {
    const routine = await createRoutine(supabase, userId, {
      title: GYM_ROUTINE_TITLE,
      domain: "health",
      priority: 3,
      freq: "weekly",
      daysOfWeek: days,
      remindTime: input.remindTime ?? DEFAULT_REMIND_TIME,
    });
    const { error } = await supabase
      .from("gym_preferences")
      .upsert({ user_id: userId, routine_id: routine.id }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  }

  return getSchedule(supabase, userId);
}

// ── Best est-1RM per exercise (all-time) — for strength-level ratings ─────────
export async function getExerciseBests(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, number>> {
  // Bodyweight moves (pull-up, dip, …) are benchmarked on total-weight 1RMs, so
  // the load is bodyweight + the plate load (the logged `weight`, which is the
  // *added* weight — 0 unweighted, negative when assisted). Fold the lifter's
  // latest bodyweight in before estimating, so unweighted reps still count.
  const [{ data, error }, exRes, bwRows] = await Promise.all([
    supabase
      .from("gym_session_exercises")
      .select("exercise_id, gym_sets ( weight, reps, is_warmup )")
      .eq("user_id", userId)
      .not("exercise_id", "is", null)
      .limit(4000),
    supabase.from("gym_exercises").select("id, is_bodyweight").eq("user_id", userId),
    listBodyWeights(supabase, userId, 1),
  ]);
  if (error) throw new Error(error.message);
  if (exRes.error) throw new Error(exRes.error.message);
  const rows =
    (data as unknown as {
      exercise_id: string | null;
      gym_sets: { weight: number | null; reps: number | null; is_warmup: boolean }[] | null;
    }[]) ?? [];

  const bodyweight = bwRows[0]?.weightKg ?? null;
  const bodyweightIds = new Set(
    ((exRes.data as { id: string; is_bodyweight: boolean }[] | null) ?? [])
      .filter((e) => e.is_bodyweight)
      .map((e) => e.id)
  );

  const best: Record<string, number> = {};
  for (const r of rows) {
    const id = r.exercise_id;
    if (!id) continue;
    const isBw = bodyweightIds.has(id);
    for (const s of r.gym_sets ?? []) {
      if (s.is_warmup || s.reps == null || s.reps <= 0) continue;
      // Non-bodyweight lifts need a logged weight; bodyweight moves fall back to
      // bodyweight alone (an unweighted set logs weight 0 or null).
      if (!isBw && s.weight == null) continue;
      const load = (isBw ? bodyweight ?? 0 : 0) + (s.weight ?? 0);
      if (!(load > 0)) continue;
      const e1rm = load * (1 + s.reps / 30);
      if (best[id] == null || e1rm > best[id]) best[id] = e1rm;
    }
  }
  return best;
}
