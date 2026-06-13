import { formatInTimeZone, toDate } from "date-fns-tz";
import type { SalesOrderRow } from "@/entities/sales-insights/model/types";

export type HourlyChartPoint = {
  hour: number;
  label: string;
  actual: number | null;
  forecast: number | null;
  isFutureHour: boolean;
};

const HOUR_SLOTS = Array.from({ length: 24 }, (_, hour) => hour);
const SAME_WEEKDAY_LOOKBACK = 8;

export function isSingleCalendarDayRange(start: Date, end: Date): boolean {
  const startKey = formatCalendarDateLocal(start);
  const endKey = formatCalendarDateLocal(end);
  return startKey === endKey;
}

function formatCalendarDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calendarDayIsoFromRange(start: Date, end: Date): string {
  return formatCalendarDateLocal(start);
}

function calendarDayInTimezone(isoDateTime: string, timezone: string): string {
  return formatInTimeZone(new Date(isoDateTime), timezone, "yyyy-MM-dd");
}

function hourInTimezone(isoDateTime: string, timezone: string): number {
  return Number(formatInTimeZone(new Date(isoDateTime), timezone, "H"));
}

function dayOfWeekInTimezone(isoDate: string, timezone: string): number {
  return Number(formatInTimeZone(toDate(`${isoDate}T12:00:00`, { timeZone: timezone }), timezone, "i"));
}

function formatHourLabel(hour: number): string {
  if (hour === 0) {
    return "12am";
  }
  if (hour < 12) {
    return `${hour}am`;
  }
  if (hour === 12) {
    return "12pm";
  }
  return `${hour - 12}pm`;
}

function emptyHourTotals(): { revenueCents: number; orders: number }[] {
  return HOUR_SLOTS.map(() => ({ revenueCents: 0, orders: 0 }));
}

/** Revenue and order count per clock hour (0–23) for one venue-local calendar day. */
export function aggregateOrdersByHourForDay(
  orders: SalesOrderRow[],
  dayIso: string,
  timezone: string
): { revenueCents: number; orders: number }[] {
  const totals = emptyHourTotals();

  for (const order of orders) {
    if (order.is_void) {
      continue;
    }
    if (calendarDayInTimezone(order.order_datetime, timezone) !== dayIso) {
      continue;
    }
    const hour = hourInTimezone(order.order_datetime, timezone);
    if (hour < 0 || hour > 23) {
      continue;
    }
    totals[hour]!.revenueCents += order.is_refund ? 0 : order.net_amount;
    if (!order.is_refund) {
      totals[hour]!.orders += 1;
    }
  }

  return totals;
}

/**
 * Average hourly revenue mix from prior same-weekday days (for spreading a daily forecast).
 */
export function buildSameWeekdayHourlyMix(
  orders: SalesOrderRow[],
  targetDayIso: string,
  timezone: string
): number[] {
  const targetDow = dayOfWeekInTimezone(targetDayIso, timezone);
  const byDay = new Map<string, number[]>();

  for (const order of orders) {
    if (order.is_void || order.is_refund) {
      continue;
    }
    const day = calendarDayInTimezone(order.order_datetime, timezone);
    if (day >= targetDayIso) {
      continue;
    }
    if (dayOfWeekInTimezone(day, timezone) !== targetDow) {
      continue;
    }
    const hour = hourInTimezone(order.order_datetime, timezone);
    if (!byDay.has(day)) {
      byDay.set(day, HOUR_SLOTS.map(() => 0));
    }
    const dayHours = byDay.get(day)!;
    dayHours[hour] = (dayHours[hour] ?? 0) + order.net_amount;
  }

  const recentDays = [...byDay.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, SAME_WEEKDAY_LOOKBACK)
    .map(([, hours]) => hours);

  if (recentDays.length === 0) {
    return HOUR_SLOTS.map(() => 1 / 24);
  }

  const avgByHour = HOUR_SLOTS.map((hour) => {
    const sum = recentDays.reduce((acc, dayHours) => acc + (dayHours[hour] ?? 0), 0);
    return sum / recentDays.length;
  });

  const total = avgByHour.reduce((acc, value) => acc + value, 0);
  if (total <= 0) {
    return HOUR_SLOTS.map(() => 1 / 24);
  }

  return avgByHour.map((value) => value / total);
}

export function distributeDailyForecastToHours(
  dailyForecastCents: number,
  hourlyMix: number[]
): number[] {
  return hourlyMix.map((weight) => Math.round(dailyForecastCents * weight));
}

export function currentHourInTimezone(timezone: string): number {
  return Number(formatInTimeZone(new Date(), timezone, "H"));
}

export function isTodayInTimezone(dayIso: string, timezone: string): boolean {
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  return dayIso === today;
}

export function buildHourlyChartPoints(args: {
  dayIso: string;
  timezone: string;
  dayOrders: SalesOrderRow[];
  patternOrders: SalesOrderRow[];
  dailyForecastRevenueCents: number | null;
}): HourlyChartPoint[] {
  const actualByHour = aggregateOrdersByHourForDay(
    args.dayOrders,
    args.dayIso,
    args.timezone
  );
  const mix = buildSameWeekdayHourlyMix(
    args.patternOrders,
    args.dayIso,
    args.timezone
  );
  const forecastByHour =
    args.dailyForecastRevenueCents !== null && args.dailyForecastRevenueCents > 0
      ? distributeDailyForecastToHours(args.dailyForecastRevenueCents, mix)
      : HOUR_SLOTS.map(() => 0);

  const isToday = isTodayInTimezone(args.dayIso, args.timezone);
  const currentHour = isToday ? currentHourInTimezone(args.timezone) : 23;

  return HOUR_SLOTS.map((hour) => {
    const actualCents = actualByHour[hour]?.revenueCents ?? 0;
    const forecastCents = forecastByHour[hour] ?? 0;
    const isFutureHour = isToday && hour > currentHour;

    const hasForecast = args.dailyForecastRevenueCents !== null && forecastCents > 0;

    return {
      hour,
      label: formatHourLabel(hour),
      actual: actualCents > 0 ? actualCents / 100 : null,
      forecast: hasForecast ? forecastCents / 100 : null,
      isFutureHour,
    };
  }).filter((point) => {
    const hasActual = (point.actual ?? 0) > 0;
    const hasForecast = (point.forecast ?? 0) > 0;
    if (hasActual || hasForecast) {
      return true;
    }
    return isToday && point.hour <= currentHour + 1;
  });
}

export function hourlyChartHasData(points: HourlyChartPoint[]): boolean {
  return points.some(
    (point) =>
      (point.actual !== null && point.actual > 0) ||
      (point.forecast !== null && point.forecast > 0)
  );
}
