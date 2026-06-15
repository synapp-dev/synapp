// Parser for "Health Auto Export" (iOS app) JSON exports of Apple Health data.
//
// The export has shape { data: { metrics: [...], workouts: [...], ecg: [...] } }.
// - metrics: each is a named daily time-series (name, units, data[]). Most points
//   carry a single `qty`; heart_rate carries Avg/Min/Max; sleep_analysis is a
//   structurally different per-night record that we pull out into sleep sessions.
// - workouts: individual sessions with summary stats plus high-frequency nested
//   arrays (per-minute heart rate, step cadence, …) that we deliberately drop.
// - ecg: raw voltage traces — not parsed here.
//
// Dates in the file look like "2026-03-16 06:56:24 +1100" (space-separated, no
// colon in the offset). Daily metrics sit at local midnight, so we key those by
// the calendar date; session timestamps are normalised to ISO 8601 with offset.

/** A single daily metric sample. `qty` is the day value; min/avg/max are only
 *  set for metrics that report a range (heart_rate). */
export type ParsedHealthMetric = {
  name: string;
  units: string | null;
  /** Local calendar date as YYYY-MM-DD. */
  date: string;
  qty: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
  source: string | null;
};

/** One night of sleep, from the sleep_analysis metric. Durations are in hours. */
export type ParsedSleepSession = {
  /** Local calendar date the night is filed under (YYYY-MM-DD). */
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
  source: string | null;
};

/** A single workout session — summary stats only. */
export type ParsedWorkout = {
  externalId: string;
  name: string;
  start: string | null;
  end: string | null;
  /** Seconds. */
  duration: number | null;
  /** kJ. */
  totalEnergy: number | null;
  activeEnergy: number | null;
  /** km. */
  distance: number | null;
  stepCount: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  minHeartRate: number | null;
  intensity: number | null;
  isIndoor: boolean | null;
  location: string | null;
  /** degC. */
  temperature: number | null;
  /** %. */
  humidity: number | null;
};

export type ParsedHealthExport = {
  metrics: ParsedHealthMetric[];
  sleep: ParsedSleepSession[];
  workouts: ParsedWorkout[];
};

const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})(?:\.\d+)? ([+-]\d{2})(\d{2})$/;

/** "2026-03-16 06:56:24 +1100" -> "2026-03-16T06:56:24+11:00" (ISO 8601). */
function toIso(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = TIMESTAMP_RE.exec(raw.trim());
  if (!match) return null;
  return `${match[1]}T${match[2]}${match[3]}:${match[4]}`;
}

/** Local calendar date (YYYY-MM-DD) from a file timestamp. */
function toDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
  return match?.[1] ?? null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseSleepSessions(points: unknown[]): ParsedSleepSession[] {
  const out: ParsedSleepSession[] = [];
  for (const raw of points) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const date = toDate(p.date) ?? toDate(p.sleepStart) ?? toDate(p.inBedStart);
    if (!date) continue;
    out.push({
      date,
      inBedStart: toIso(p.inBedStart),
      inBedEnd: toIso(p.inBedEnd),
      sleepStart: toIso(p.sleepStart),
      sleepEnd: toIso(p.sleepEnd),
      totalSleep: num(p.totalSleep),
      rem: num(p.rem),
      deep: num(p.deep),
      core: num(p.core),
      awake: num(p.awake),
      asleep: num(p.asleep),
      inBed: num(p.inBed),
      source: str(p.source),
    });
  }
  return out;
}

function parseMetricSamples(
  name: string,
  units: string | null,
  points: unknown[]
): ParsedHealthMetric[] {
  const out: ParsedHealthMetric[] = [];
  for (const raw of points) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const date = toDate(p.date);
    if (!date) continue;

    // Most metrics carry `qty`; range metrics (heart_rate) carry Avg/Min/Max.
    const avg = num(p.Avg);
    const qty = num(p.qty) ?? avg;
    if (qty == null && avg == null) continue;

    out.push({
      name,
      units,
      date,
      qty,
      min: num(p.Min),
      avg,
      max: num(p.Max),
      source: str(p.source),
    });
  }
  return out;
}

function parseWorkouts(workouts: unknown[]): ParsedWorkout[] {
  const out: ParsedWorkout[] = [];
  for (const raw of workouts) {
    if (!raw || typeof raw !== "object") continue;
    const w = raw as Record<string, unknown>;
    const externalId = str(w.id);
    if (!externalId) continue;

    const qtyOf = (v: unknown): number | null =>
      v && typeof v === "object" ? num((v as Record<string, unknown>).qty) : null;
    const hr = (w.heartRate ?? {}) as Record<string, unknown>;

    out.push({
      externalId,
      name: str(w.name) ?? "Workout",
      start: toIso(w.start),
      end: toIso(w.end),
      duration: num(w.duration),
      totalEnergy: qtyOf(w.totalEnergy),
      activeEnergy: qtyOf(w.activeEnergyBurned),
      distance: qtyOf(w.distance),
      stepCount: qtyOf(w.stepCount),
      avgHeartRate: qtyOf(w.avgHeartRate) ?? qtyOf(hr.avg),
      maxHeartRate: qtyOf(w.maxHeartRate) ?? qtyOf(hr.max),
      minHeartRate: qtyOf(hr.min),
      intensity: qtyOf(w.intensity),
      isIndoor: typeof w.isIndoor === "boolean" ? w.isIndoor : null,
      location: str(w.location),
      temperature: qtyOf(w.temperature),
      humidity: qtyOf(w.humidity),
    });
  }
  return out;
}

/** Parse a Health Auto Export JSON payload (object or raw string). */
export function parseHealthExport(input: unknown): ParsedHealthExport {
  const root =
    typeof input === "string" ? (JSON.parse(input) as unknown) : input;
  const data =
    root && typeof root === "object"
      ? ((root as Record<string, unknown>).data as
          | Record<string, unknown>
          | undefined)
      : undefined;

  const metricsRaw = Array.isArray(data?.metrics) ? data!.metrics : [];
  const workoutsRaw = Array.isArray(data?.workouts) ? data!.workouts : [];

  const metrics: ParsedHealthMetric[] = [];
  let sleep: ParsedSleepSession[] = [];

  for (const raw of metricsRaw) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as Record<string, unknown>;
    const name = str(m.name);
    if (!name) continue;
    const points = Array.isArray(m.data) ? m.data : [];
    if (name === "sleep_analysis") {
      sleep = parseSleepSessions(points);
      continue;
    }
    metrics.push(...parseMetricSamples(name, str(m.units), points));
  }

  return { metrics, sleep, workouts: parseWorkouts(workoutsRaw) };
}
