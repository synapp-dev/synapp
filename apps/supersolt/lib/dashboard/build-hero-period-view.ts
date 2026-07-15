import type {
  DashboardHeroData,
  DashboardNetRevenuePoint,
} from "@/entities/dashboard/model/dummy-dashboard-data";
import { addDaysCalendarIso, listCalendarDatesBetween } from "@/lib/date/calendar-iso";
import { heroPeriodOption, type HeroPeriodKey } from "@/lib/dashboard/hero-period";

export type HeroPeriodView = {
  hero: DashboardHeroData;
  netRevenueSeries: DashboardNetRevenuePoint[];
};

type DailyRevenueRow = { date: string; revenueCents: number };

function formatAudFromCents(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function periodChartLabel(date: string, withYear: boolean): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

/**
 * Hero headline + chart series for a non-default trailing period, built from
 * synced daily_sales rows. Today's number comes from the live snapshot when
 * available (the synced row can lag); like the default view, today only
 * joins the actual line once it has trade, and up to three projected days
 * are appended when the forecast engine has them.
 */
export function buildHeroPeriodView(args: {
  periodKey: HeroPeriodKey;
  /** Venue-local calendar date for today. */
  today: string;
  /** Rows covering the period AND its comparison window, any order. */
  dailySales: DailyRevenueRow[];
  revenueForecastCentsByDate?: Record<string, number>;
  /** Live today from the dashboard snapshot; null = fall back to the row. */
  todayLive?: { revenueCents: number; hasTrade: boolean } | null;
}): HeroPeriodView {
  const option = heroPeriodOption(args.periodKey);
  const rowByDate = new Map(args.dailySales.map((row) => [row.date, row]));
  const forecastMap = args.revenueForecastCentsByDate ?? {};

  const firstRowDate = args.dailySales.reduce<string | null>(
    (min, row) => (min === null || row.date < min ? row.date : min),
    null,
  );
  const fromDate =
    option.days !== null
      ? addDaysCalendarIso(args.today, -(option.days - 1))
      : (firstRowDate ?? args.today);

  const todayRow = rowByDate.get(args.today);
  const todayHasTrade =
    args.todayLive != null
      ? args.todayLive.hasTrade
      : (todayRow?.revenueCents ?? 0) > 0;
  const todayRevenueCents =
    args.todayLive != null && args.todayLive.hasTrade
      ? args.todayLive.revenueCents
      : (todayRow?.revenueCents ?? 0);

  const periodDates = listCalendarDatesBetween(fromDate, args.today);
  let totalCents = 0;
  for (const date of periodDates) {
    totalCents +=
      date === args.today
        ? todayHasTrade
          ? todayRevenueCents
          : 0
        : (rowByDate.get(date)?.revenueCents ?? 0);
  }

  let deltaPercent: number | null = null;
  let deltaDirection: "up" | "down" = "up";
  if (option.days !== null) {
    const prevDates = listCalendarDatesBetween(
      addDaysCalendarIso(fromDate, -option.days),
      addDaysCalendarIso(fromDate, -1),
    );
    const prevCents = prevDates.reduce(
      (sum, date) => sum + (rowByDate.get(date)?.revenueCents ?? 0),
      0,
    );
    if (prevCents > 0) {
      const pct = ((totalCents - prevCents) / prevCents) * 100;
      deltaPercent = Math.abs(pct);
      deltaDirection = pct >= 0 ? "up" : "down";
    }
  }

  // Labels need a year once the window can span two of the same calendar day.
  const withYear = periodDates.length > 300;
  const futureDates = [1, 2, 3]
    .map((offset) => addDaysCalendarIso(args.today, offset))
    .filter((date) => forecastMap[date] !== undefined);

  const netRevenueSeries: DashboardNetRevenuePoint[] = [
    ...periodDates.map((date) => ({
      label: date === args.today ? "Today" : periodChartLabel(date, withYear),
      revenue:
        date === args.today
          ? todayHasTrade
            ? todayRevenueCents / 100
            : null
          : (rowByDate.get(date)?.revenueCents ?? 0) / 100,
      forecast:
        forecastMap[date] !== undefined ? forecastMap[date]! / 100 : null,
    })),
    ...futureDates.map((date) => ({
      label: periodChartLabel(date, withYear),
      revenue: null,
      forecast: forecastMap[date]! / 100,
    })),
  ];

  return {
    hero: {
      periodLabel: option.label,
      metricLabel: "Net Revenue",
      value: formatAudFromCents(totalCents),
      countUpEnd: totalCents / 100,
      countUpDecimals: 2,
      deltaPercent,
      deltaDirection,
      comparisonLabel: option.comparisonLabel ?? "",
    },
    netRevenueSeries,
  };
}
