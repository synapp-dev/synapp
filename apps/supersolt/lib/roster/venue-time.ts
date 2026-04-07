import { formatInTimeZone, toDate } from "date-fns-tz";

function addDaysCalendarIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

/** `[dayStart, dayEnd)` in UTC for a venue-local calendar date. */
export function venueCalendarDayBoundsUtc(
  isoDate: string,
  timezone: string
): { dayStartUtc: Date; dayEndExclusiveUtc: Date } {
  const dayStartUtc = toDate(`${isoDate} 00:00:00`, { timeZone: timezone });
  const nextIso = addDaysCalendarIso(isoDate, 1);
  const dayEndExclusiveUtc = toDate(`${nextIso} 00:00:00`, { timeZone: timezone });
  return { dayStartUtc, dayEndExclusiveUtc };
}

/** Inclusive start, exclusive end in UTC for roster queries (venue wall clock). */
export function venueWeekRangeUtc(weekStartIso: string, timezone: string): { startUtc: Date; endExclusiveUtc: Date } {
  const startUtc = toDate(`${weekStartIso} 00:00:00`, { timeZone: timezone });
  const endIso = addDaysCalendarIso(weekStartIso, 7);
  const endExclusiveUtc = toDate(`${endIso} 00:00:00`, { timeZone: timezone });
  return { startUtc, endExclusiveUtc };
}

/** Today's calendar date in the venue IANA timezone. */
export function todayCalendarIsoInVenue(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

/** Monday (ISO week) of the week containing `isoDate`, interpreted in `timezone`. */
export function mondayOfIsoWeekContainingCalendarDay(isoDate: string, timezone: string): string {
  const inst = toDate(`${isoDate}T12:00:00`, { timeZone: timezone });
  const isoDow = Number(formatInTimeZone(inst, timezone, "i"));
  const offset = isoDow - 1;
  return addDaysCalendarIso(isoDate, -offset);
}

export function mondayThisWeekInVenue(timezone: string): string {
  return mondayOfIsoWeekContainingCalendarDay(todayCalendarIsoInVenue(timezone), timezone);
}

/** Local calendar date (YYYY-MM-DD) for an instant in the venue timezone. */
export function formatShiftDateInVenue(isoTimestamptz: string, timezone: string): string {
  return formatInTimeZone(isoTimestamptz, timezone, "yyyy-MM-dd");
}

/** HH:mm for display in venue local time. */
export function formatShiftClockInVenue(isoTimestamptz: string, timezone: string): string {
  return formatInTimeZone(isoTimestamptz, timezone, "HH:mm");
}

function padHms(t: string): string {
  const parts = t.split(":").map((x) => x.trim());
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "00";
  const s = parts[2] ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const p = isoDate.split("-").map(Number);
  const y = p[0] ?? 0;
  const mo = p[1] ?? 1;
  const d = p[2] ?? 1;
  const dt = new Date(y, mo - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Build UTC instants for a shift on `shiftDateIso` with local start/end times in `timezone`.
 * If end clock is not after start clock on the same calendar day, end is placed on the next day.
 */
export function shiftBoundsUtc(
  shiftDateIso: string,
  startHms: string,
  endHms: string,
  timezone: string
): { startsAt: Date; endsAt: Date } {
  const startLocal = `${shiftDateIso} ${padHms(startHms)}`;
  const startsAt = toDate(startLocal, { timeZone: timezone });

  const [sh, sm] = startHms.split(":").map((x) => Number(x));
  const [eh, em] = endHms.split(":").map((x) => Number(x));
  const startM = (sh ?? 0) * 60 + (sm ?? 0);
  const endM = (eh ?? 0) * 60 + (em ?? 0);
  const endDateIso = endM <= startM ? addDaysToIsoDate(shiftDateIso, 1) : shiftDateIso;
  const endLocal = `${endDateIso} ${padHms(endHms)}`;
  const endsAt = toDate(endLocal, { timeZone: timezone });

  return { startsAt, endsAt };
}
