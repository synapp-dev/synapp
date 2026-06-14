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

export const ROUTINE_FREQS = ["daily", "weekly", "monthly", "interval"] as const;
export type RoutineFreq = (typeof ROUTINE_FREQS)[number];

export type Routine = {
  id: string;
  title: string;
  notes: string | null;
  domain: RoutineDomain;
  priority: number;
  freq: RoutineFreq;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  remindTime: string;
  timezone: string;
  active: boolean;
  // Interval ("ping") fields.
  intervalMinutes: number | null;
  windowStart: string;
  windowEnd: string;
  nextFireAt: string | null;
  lastAckedAt: string | null;
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
  remindTime?: string;
  timezone?: string;
  active?: boolean;
  intervalMinutes?: number | null;
  windowStart?: string;
  windowEnd?: string;
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
  interval_minutes: number | null;
  window_start: string;
  window_end: string;
  next_fire_at: string | null;
  last_acked_at: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS =
  "id, title, notes, domain, priority, freq, days_of_week, day_of_month, remind_time, timezone, active, interval_minutes, window_start, window_end, next_fire_at, last_acked_at, created_at, updated_at";

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
    intervalMinutes: row.interval_minutes,
    windowStart: row.window_start.slice(0, 5),
    windowEnd: row.window_end.slice(0, 5),
    nextFireAt: row.next_fire_at,
    lastAckedAt: row.last_acked_at,
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

export async function getRoutine(
  supabase: SupabaseClient,
  routineId: string
): Promise<Routine | null> {
  const { data, error } = await supabase
    .from("routines")
    .select(COLUMNS)
    .eq("id", routineId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRoutine(data as RoutineRow) : null;
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
      remind_time: input.remindTime ?? "08:00",
      timezone: input.timezone ?? "Australia/Sydney",
      active: input.active ?? true,
      interval_minutes: input.intervalMinutes ?? null,
      window_start: input.windowStart ?? "08:00",
      window_end: input.windowEnd ?? "21:00",
    })
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const routine = toRoutine(data as RoutineRow);

  // Interval routines need their first fire time computed immediately.
  if (routine.freq === "interval") {
    routine.nextFireAt = await advancePing(routine.id);
  }
  return routine;
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
  if (input.intervalMinutes !== undefined)
    patch.interval_minutes = input.intervalMinutes;
  if (input.windowStart !== undefined) patch.window_start = input.windowStart;
  if (input.windowEnd !== undefined) patch.window_end = input.windowEnd;

  const { data, error } = await supabase
    .from("routines")
    .update(patch)
    .eq("id", routineId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  const routine = toRoutine(data as RoutineRow);

  // Recompute the next fire after schedule changes to an interval routine.
  if (routine.freq === "interval") {
    routine.nextFireAt = await advancePing(routine.id);
  }
  return routine;
}

export async function deleteRoutine(
  supabase: SupabaseClient,
  routineId: string
): Promise<void> {
  await supabase
    .from("tasks")
    .delete()
    .eq("routine_id", routineId)
    .eq("status", "open");
  const { error } = await supabase.from("routines").delete().eq("id", routineId);
  if (error) throw new Error(error.message);
}

/** Record an acknowledgement of a ping ("Got it"). */
export async function ackPing(
  supabase: SupabaseClient,
  routineId: string
): Promise<Routine> {
  const { data, error } = await supabase
    .from("routines")
    .update({ last_acked_at: new Date().toISOString() })
    .eq("id", routineId)
    .select(COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return toRoutine(data as RoutineRow);
}

/** Spawn today's due (task-kind) occurrences for the user — tz-aware, idempotent. */
export async function materializeForUser(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("materialize_due_routines", {
    p_user_id: userId,
  });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

/** Advance a ping routine to its next future slot; returns the new fire time. */
export async function advancePing(routineId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("advance_ping", {
    p_routine_id: routineId,
  });
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}
