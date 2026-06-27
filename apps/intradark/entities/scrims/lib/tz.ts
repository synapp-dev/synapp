/**
 * Lightweight timezone helpers built on `Intl` (date-fns-tz is not a dependency).
 * Good enough for hourly scrim slots; DST transition hours are approximated.
 */

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function offsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    // "24" can appear at midnight in some locales; normalise to 0.
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - instant.getTime();
}

/** UTC instant for a wall-clock time in `timeZone`. */
export function zonedWallToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, 0, 0);
  const off = offsetMs(timeZone, new Date(guess));
  return new Date(guess - off);
}

/** The 24 hourly UTC instants making up `localDay` in `timeZone`. */
export function zonedDayHours(localDay: Date, timeZone: string): Date[] {
  const y = localDay.getFullYear();
  const m = localDay.getMonth() + 1;
  const d = localDay.getDate();
  return Array.from({ length: 24 }, (_, h) => zonedWallToUtc(timeZone, y, m, d, h));
}

/** Hour-of-day (0–23) of `instant` within `timeZone`. */
export function hourInZone(instant: Date, timeZone: string): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
  }).format(instant);
  return Number(h) % 24;
}

/** Format an instant in `timeZone` using Intl options. */
export function formatInZone(
  instant: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(instant);
}
