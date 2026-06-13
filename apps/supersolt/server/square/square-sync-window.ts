import { addDaysCalendarIso } from "@/lib/date/calendar-iso";
import {
  todayCalendarIsoInVenue,
  venueCalendarDayBoundsUtc,
} from "@/lib/roster/venue-time";

/** Inclusive ISO instants for incremental Square sync (rolling venue-local lookback). */
export function rollingSyncIsoRange(
  timezone: string,
  lookbackDays = 3,
  todayIso?: string,
): { startIso: string; endIso: string } {
  const today = todayIso ?? todayCalendarIsoInVenue(timezone);
  const startDay = addDaysCalendarIso(today, -(Math.max(1, lookbackDays) - 1));
  const { dayStartUtc } = venueCalendarDayBoundsUtc(startDay, timezone);
  const { dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(today, timezone);
  const endIso = new Date(dayEndExclusiveUtc.getTime() - 1).toISOString();
  return { startIso: dayStartUtc.toISOString(), endIso };
}

export function isoRangeFromDates(
  timezone: string,
  fromDay: string,
  toDay: string,
): { startIso: string; endIso: string } {
  const { dayStartUtc } = venueCalendarDayBoundsUtc(fromDay, timezone);
  const { dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(toDay, timezone);
  const endIso = new Date(dayEndExclusiveUtc.getTime() - 1).toISOString();
  return { startIso: dayStartUtc.toISOString(), endIso };
}
