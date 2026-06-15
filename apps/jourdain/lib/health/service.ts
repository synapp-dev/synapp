import { createAdminClient } from "@/utils/supabase/admin";
import { parseHealthExport } from "@/lib/import/health";

export type HealthImportSummary = {
  metrics: number;
  sleepNights: number;
  workouts: number;
};

export type HealthMetricSample = {
  name: string;
  units: string | null;
  date: string;
  qty: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
};

export type SleepNight = {
  date: string;
  inBedStart: string | null;
  inBedEnd: string | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  totalSleep: number | null;
  rem: number | null;
  deep: number | null;
  core: number | null;
  awake: number | null;
  asleep: number | null;
  inBed: number | null;
};

export type Workout = {
  id: string;
  name: string;
  start: string | null;
  end: string | null;
  duration: number | null;
  totalEnergy: number | null;
  activeEnergy: number | null;
  distance: number | null;
  stepCount: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  intensity: number | null;
  isIndoor: boolean | null;
  location: string | null;
  temperature: number | null;
  humidity: number | null;
};

const BATCH = 500;

async function upsertInBatches<T>(
  table: string,
  rows: T[],
  onConflict: string
): Promise<void> {
  const admin = createAdminClient();
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await admin
      .from(table)
      .upsert(rows.slice(i, i + BATCH) as Record<string, unknown>[], {
        onConflict,
      });
    if (error) throw new Error(error.message);
  }
}

/** Parse a Health Auto Export payload and upsert all sections for the user.
 *  Upserts are idempotent on natural keys, so re-importing is safe. */
export async function importHealth(
  userId: string,
  input: unknown
): Promise<HealthImportSummary> {
  const parsed = parseHealthExport(input);
  const nowIso = new Date().toISOString();

  const metricRows = parsed.metrics.map((m) => ({
    user_id: userId,
    name: m.name,
    units: m.units,
    measured_on: m.date,
    qty: m.qty,
    qty_min: m.min,
    qty_avg: m.avg,
    qty_max: m.max,
    source: m.source,
    updated_at: nowIso,
  }));

  const sleepRows = parsed.sleep.map((s) => ({
    user_id: userId,
    measured_on: s.date,
    in_bed_start: s.inBedStart,
    in_bed_end: s.inBedEnd,
    sleep_start: s.sleepStart,
    sleep_end: s.sleepEnd,
    total_sleep: s.totalSleep,
    rem: s.rem,
    deep: s.deep,
    core: s.core,
    awake: s.awake,
    asleep: s.asleep,
    in_bed: s.inBed,
    source: s.source,
    updated_at: nowIso,
  }));

  const workoutRows = parsed.workouts.map((w) => ({
    user_id: userId,
    external_id: w.externalId,
    name: w.name,
    started_at: w.start,
    ended_at: w.end,
    duration: w.duration,
    total_energy: w.totalEnergy,
    active_energy: w.activeEnergy,
    distance: w.distance,
    step_count: w.stepCount,
    avg_heart_rate: w.avgHeartRate,
    max_heart_rate: w.maxHeartRate,
    min_heart_rate: w.minHeartRate,
    intensity: w.intensity,
    is_indoor: w.isIndoor,
    location: w.location,
    temperature: w.temperature,
    humidity: w.humidity,
    updated_at: nowIso,
  }));

  await upsertInBatches("health_metrics", metricRows, "user_id,name,measured_on");
  await upsertInBatches("health_sleep", sleepRows, "user_id,measured_on");
  await upsertInBatches("health_workouts", workoutRows, "user_id,external_id");

  return {
    metrics: metricRows.length,
    sleepNights: sleepRows.length,
    workouts: workoutRows.length,
  };
}

/** Daily samples for the requested metric names, oldest first. */
export async function getHealthMetrics(
  userId: string,
  names: string[]
): Promise<HealthMetricSample[]> {
  if (names.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("health_metrics")
    .select("name, units, measured_on, qty, qty_min, qty_avg, qty_max")
    .eq("user_id", userId)
    .in("name", names)
    .order("measured_on", { ascending: true });

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    name: row.name as string,
    units: (row.units as string | null) ?? null,
    date: row.measured_on as string,
    qty: row.qty != null ? Number(row.qty) : null,
    min: row.qty_min != null ? Number(row.qty_min) : null,
    avg: row.qty_avg != null ? Number(row.qty_avg) : null,
    max: row.qty_max != null ? Number(row.qty_max) : null,
  }));
}

export async function getSleepNights(userId: string): Promise<SleepNight[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("health_sleep")
    .select(
      "measured_on, in_bed_start, in_bed_end, sleep_start, sleep_end, total_sleep, rem, deep, core, awake, asleep, in_bed"
    )
    .eq("user_id", userId)
    .order("measured_on", { ascending: true });

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    date: row.measured_on as string,
    inBedStart: (row.in_bed_start as string | null) ?? null,
    inBedEnd: (row.in_bed_end as string | null) ?? null,
    sleepStart: (row.sleep_start as string | null) ?? null,
    sleepEnd: (row.sleep_end as string | null) ?? null,
    totalSleep: row.total_sleep != null ? Number(row.total_sleep) : null,
    rem: row.rem != null ? Number(row.rem) : null,
    deep: row.deep != null ? Number(row.deep) : null,
    core: row.core != null ? Number(row.core) : null,
    awake: row.awake != null ? Number(row.awake) : null,
    asleep: row.asleep != null ? Number(row.asleep) : null,
    inBed: row.in_bed != null ? Number(row.in_bed) : null,
  }));
}

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("health_workouts")
    .select(
      "external_id, name, started_at, ended_at, duration, total_energy, active_energy, distance, step_count, avg_heart_rate, max_heart_rate, min_heart_rate, intensity, is_indoor, location, temperature, humidity"
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false });

  return ((data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    id: row.external_id as string,
    name: row.name as string,
    start: (row.started_at as string | null) ?? null,
    end: (row.ended_at as string | null) ?? null,
    duration: row.duration != null ? Number(row.duration) : null,
    totalEnergy: row.total_energy != null ? Number(row.total_energy) : null,
    activeEnergy: row.active_energy != null ? Number(row.active_energy) : null,
    distance: row.distance != null ? Number(row.distance) : null,
    stepCount: row.step_count != null ? Number(row.step_count) : null,
    avgHeartRate: row.avg_heart_rate != null ? Number(row.avg_heart_rate) : null,
    maxHeartRate: row.max_heart_rate != null ? Number(row.max_heart_rate) : null,
    minHeartRate: row.min_heart_rate != null ? Number(row.min_heart_rate) : null,
    intensity: row.intensity != null ? Number(row.intensity) : null,
    isIndoor: (row.is_indoor as boolean | null) ?? null,
    location: (row.location as string | null) ?? null,
    temperature: row.temperature != null ? Number(row.temperature) : null,
    humidity: row.humidity != null ? Number(row.humidity) : null,
  }));
}
