import {
  addDaysCalendarIso,
  listCalendarDatesBetween,
} from "@/lib/date/calendar-iso";
import {
  mondayOfIsoWeekContainingCalendarDay,
  todayCalendarIsoInVenue,
  venueCalendarDayBoundsUtc,
} from "@/lib/roster/venue-time";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function thisWeekCalendarBoundsInVenue(
  timezone: string,
  todayIso?: string,
): {
  weekMonday: string;
  weekSunday: string;
  throughDate: string;
  weekDatesThroughToday: string[];
  fullWeekDates: string[];
  weekdayLabels: readonly string[];
} {
  const today = todayIso ?? todayCalendarIsoInVenue(timezone);
  const weekMonday = mondayOfIsoWeekContainingCalendarDay(today, timezone);
  const weekSunday = addDaysCalendarIso(weekMonday, 6);
  const throughDate = today < weekSunday ? today : weekSunday;

  return {
    weekMonday,
    weekSunday,
    throughDate,
    weekDatesThroughToday: listCalendarDatesBetween(weekMonday, throughDate),
    fullWeekDates: listCalendarDatesBetween(weekMonday, weekSunday),
    weekdayLabels: WEEKDAY_LABELS,
  };
}

export function previousComparableWeekDatesInVenue(
  weekMonday: string,
  thisWeekDatesThroughToday: string[],
): { prevWeekMonday: string; prevComparableDates: string[] } {
  const prevWeekMonday = addDaysCalendarIso(weekMonday, -7);
  const prevComparableEnd = addDaysCalendarIso(
    prevWeekMonday,
    Math.max(0, thisWeekDatesThroughToday.length - 1),
  );
  return {
    prevWeekMonday,
    prevComparableDates: listCalendarDatesBetween(prevWeekMonday, prevComparableEnd),
  };
}

/** Inclusive ISO instants for fetching Square payments across two venue-local weeks. */
export function dashboardSalesFetchIsoRange(
  timezone: string,
  todayIso?: string,
): { startIso: string; endIso: string } {
  const { weekMonday } = thisWeekCalendarBoundsInVenue(timezone, todayIso);
  const prevWeekMonday = addDaysCalendarIso(weekMonday, -7);
  const { dayStartUtc } = venueCalendarDayBoundsUtc(prevWeekMonday, timezone);
  const { weekSunday } = thisWeekCalendarBoundsInVenue(timezone, todayIso);
  const { dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(weekSunday, timezone);
  const endIso = new Date(dayEndExclusiveUtc.getTime() - 1).toISOString();
  return { startIso: dayStartUtc.toISOString(), endIso };
}
