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

/**
 * Rolling hero-chart window centred on today: 3 days of history, today,
 * 3 days of projection. Keeps the chart populated on a fresh Monday.
 */
export function heroChartWindowInVenue(
  timezone: string,
  todayIso?: string,
): { today: string; fromDate: string; toDate: string; dates: string[] } {
  const today = todayIso ?? todayCalendarIsoInVenue(timezone);
  const fromDate = addDaysCalendarIso(today, -3);
  const toDate = addDaysCalendarIso(today, 3);
  return {
    today,
    fromDate,
    toDate,
    dates: listCalendarDatesBetween(fromDate, toDate),
  };
}

/**
 * Inclusive ISO instants for fetching the dashboard's Square orders: from 13
 * days back (the trailing-7-day hero plus its comparison window — which also
 * always covers the previous ISO week the avg-check KPI compares against)
 * through the end of the current venue-local week.
 */
export function dashboardSalesFetchIsoRange(
  timezone: string,
  todayIso?: string,
): { startIso: string; endIso: string } {
  const today = todayIso ?? todayCalendarIsoInVenue(timezone);
  const rangeStart = addDaysCalendarIso(today, -13);
  const { dayStartUtc } = venueCalendarDayBoundsUtc(rangeStart, timezone);
  const { weekSunday } = thisWeekCalendarBoundsInVenue(timezone, todayIso);
  const { dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(weekSunday, timezone);
  const endIso = new Date(dayEndExclusiveUtc.getTime() - 1).toISOString();
  return { startIso: dayStartUtc.toISOString(), endIso };
}
