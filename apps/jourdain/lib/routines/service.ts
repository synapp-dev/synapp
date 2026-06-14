import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

export const ROUTINE_DOMAINS = [
  "identity",
  "health",
  "work",
  "social",
  "finance",
] as const;
export type RoutineDomain = (typeof ROUTINE_DOMAINS)[number];

export const ROUTINE_FREQS = ["daily", "weekly", "monthly"] as const;
export type RoutineFreq = (typeof ROUTINE_FREQS)[number];

export type Routine = {
  id: string;
  title: string;
  notes: string | null;
  domain: RoutineDomain;
  priority: number;
  freq: RoutineFreq;
  /** 0=Sun..6=Sat, used when freq is "weekly". */
  daysOfWeek: number[];
  /** 1..31, used when freq is "monthly". */
  dayOfMonth: number | null;
  /** Local reminder time as "HH:MM". */
  remindTime: string;
  timezone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRoutineInput = {
  title: string;
  notes?: string | null;
  domain: RoutineDomain;
  priority?: number;
  freq: RoutineFreq;
  daysOfWeek?: number[];
  dayOfMonth?: number | null;
  remindTime: string;
  timezone?: string;
  active?: boolean;
};

export type UpdateRoutineInput = Partial<CreateRoutineInput>;

type RoutineRow = {
  id: string;
  title: string;
  notes: string | null;
  domain: RoutineDomain;
  priority: number;
  freq: RoutineFreq;
  days_of_week: number[] | null;
  day_of_month: number | null;
  remind_time: string;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, title, notes, domain, priority, freq, days_of_week, day_of_month, remind_time, timezone, active, created_at, updated_at";

function toRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes,
    domain: row.domain,
    priority: row.priority,
    freq: row.freq,
    daysOfWeek: row.days_of_week ?? [],
    dayOfMonth: row.day_of_month,
    remindTime: row.remind_time.slice(0, 5),
    timezone: row.timezone,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listRoutines(
  supabase: SupabaseClient
): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select(COLUMNS)
    .order("domain", { ascending: true })
    .order("remind_time", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as RoutineRow[]).map(toRoutine);
}

export async function createRoutine(
  supabase: SupabaseClient,
  userId: string,
  input: CreateRoutineInput
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .insert({
      user_id: userId,
      title: input.title,
      notes: input.notes ?? null,
      domain: input.domain,
      priority: input.priority ?? 4,
      freq: input.freq,
      days_of_week: input.daysOfWeek ?? [],
      day_of_month: input.dayOfMonth ?? null,
      remind_time: input.remindTime,
      timezone: input.timezone ?? "Australia/Sydney",
      active: input.active ?? true,
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toRoutine(data as RoutineRow);
}

export async function updateRoutine(
  supabase: SupabaseClient,
  routineId: string,
  input: UpdateRoutineInput
): Promise<Routine> {
  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.domain !== undefined) patch.domain = input.domain;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.freq !== undefined) patch.freq = input.freq;
  if (input.daysOfWeek !== undefined) patch.days_of_week = input.daysOfWeek;
  if (input.dayOfMonth !== undefined) patch.day_of_month = input.dayOfMonth;
  if (input.remindTime !== undefined) patch.remind_time = input.remindTime;
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.active !== undefined) patch.active = input.active;

  const { data, error } = await supabase
    .from("routines")
    .update(patch)
    .eq("id", routineId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toRoutine(data as RoutineRow);
}

export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string
): Promise<void> {
  // Drop future, not-yet-completed occurrences; completed ones stay as history
  // (their routine_id is nulled by the FK's ON DELETE SET NULL).
  await supabase
    .from("tasks")
    .delete()
    .eq("routine_id", routineId)
    .eq("status", "open");
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw new Error(error.message);
}

/** Spawn today's due occurrences for the user (idempotent, tz-aware). */
export async function materializeForUser(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("materialize_due_routines", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
