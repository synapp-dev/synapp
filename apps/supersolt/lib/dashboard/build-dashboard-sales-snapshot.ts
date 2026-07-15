import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import type {
  DashboardHeroData,
  DashboardKpiData,
  DashboardNetRevenuePoint,
} from "@/entities/dashboard/model/dummy-dashboard-data";
import { addDaysCalendarIso, listCalendarDatesBetween } from "@/lib/date/calendar-iso";
import {
  dashboardSalesFetchIsoRange,
  heroChartWindowInVenue,
  previousComparableWeekDatesInVenue,
  thisWeekCalendarBoundsInVenue,
} from "@/lib/dashboard/dashboard-sales-week";
import {
  aggregateOrdersToDailySales,
  type DailySalesAggregate,
} from "@/lib/sales/daily-sales-aggregate";

export type DashboardLiveSalesSlice = {
  dataSource: "square";
  hero: DashboardHeroData;
  netRevenueSeries: DashboardNetRevenuePoint[];
  avgCheckKpi: DashboardKpiData;
};

function sumForDates(
  byDate: Map<string, DailySalesAggregate>,
  dates: string[],
  pick: (day: DailySalesAggregate) => number,
): number {
  return dates.reduce((sum, date) => sum + pick(byDate.get(date) ?? emptyDay(date)), 0);
}

function emptyDay(date: string): DailySalesAggregate {
  return {
    date,
    revenueCents: 0,
    ordersCount: 0,
    avgCheckCents: 0,
    refundsCount: 0,
    refundsValueCents: 0,
    voidsCount: 0,
    dineInRevenueCents: 0,
    pickUpRevenueCents: 0,
    deliveryRevenueCents: 0,
  };
}

function pctDelta(
  current: number,
  previous: number,
): { deltaPercent: number; deltaDirection: "up" | "down" } {
  if (previous === 0) {
    return {
      deltaPercent: current > 0 ? 100 : 0,
      deltaDirection: current >= 0 ? "up" : "down",
    };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    deltaPercent: Math.abs(pct),
    deltaDirection: pct >= 0 ? "up" : "down",
  };
}

function sparkDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(new Date(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

function weekdayShortLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", { weekday: "short" }).format(
    new Date(y ?? 0, (m ?? 1) - 1, d ?? 1),
  );
}

function formatAudFromCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/** Flattens forecast rows (any source shape) into a date → revenue-cents map. */
export function revenueForecastCentsByDate(
  rows: Array<{ date: string; metric: string; forecastValue: number }>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (row.metric === "revenue") {
      map[row.date] = row.forecastValue;
    }
  }
  return map;
}

export function buildDashboardSalesSnapshot(args: {
  orders: SalesOrderRow[];
  timezone: string;
  /** Projected revenue in cents keyed by venue-local calendar date (forecast engine). */
  revenueForecastCentsByDate?: Record<string, number>;
  /** Override for tests; defaults to today in the venue timezone. */
  todayIso?: string;
}): DashboardLiveSalesSlice {
  const daily = aggregateOrdersToDailySales(args.orders, args.timezone);
  const byDate = new Map(daily.map((row) => [row.date, row]));

  const { weekMonday, weekDatesThroughToday } = thisWeekCalendarBoundsInVenue(
    args.timezone,
    args.todayIso,
  );
  const { prevWeekMonday, prevComparableDates } = previousComparableWeekDatesInVenue(
    weekMonday,
    weekDatesThroughToday,
  );

  // Hero metric: trailing 7 days through today vs the 7 days before that.
  const heroToday =
    weekDatesThroughToday[weekDatesThroughToday.length - 1] ?? weekMonday;
  const last7Dates = listCalendarDatesBetween(
    addDaysCalendarIso(heroToday, -6),
    heroToday,
  );
  const prev7Dates = listCalendarDatesBetween(
    addDaysCalendarIso(heroToday, -13),
    addDaysCalendarIso(heroToday, -7),
  );

  const heroRevenueCents = sumForDates(byDate, last7Dates, (d) => d.revenueCents);
  const heroPrevRevenueCents = sumForDates(byDate, prev7Dates, (d) => d.revenueCents);

  // Avg-check keeps its calendar-week comparison ("vs same days last week").
  const weekRevenueCents = sumForDates(byDate, weekDatesThroughToday, (d) => d.revenueCents);
  const prevWeekRevenueCents = sumForDates(byDate, prevComparableDates, (d) => d.revenueCents);
  const thisOrders = sumForDates(byDate, weekDatesThroughToday, (d) => d.ordersCount);
  const prevOrders = sumForDates(byDate, prevComparableDates, (d) => d.ordersCount);

  const thisAvgCheckCents =
    thisOrders === 0 ? 0 : Math.round(weekRevenueCents / thisOrders);
  const prevAvgCheckCents =
    prevOrders === 0 ? 0 : Math.round(prevWeekRevenueCents / prevOrders);

  const revenueDelta = pctDelta(heroRevenueCents, heroPrevRevenueCents);
  const avgCheckDelta = pctDelta(thisAvgCheckCents, prevAvgCheckCents);

  const heroDollars = heroRevenueCents / 100;

  const hero: DashboardHeroData = {
    periodLabel: "Last 7 days",
    metricLabel: "Net Revenue",
    value: formatAudFromCents(heroRevenueCents),
    countUpEnd: heroDollars,
    countUpDecimals: 2,
    deltaPercent: revenueDelta.deltaPercent,
    deltaDirection: revenueDelta.deltaDirection,
    comparisonLabel: "vs previous 7 days",
  };

  // Rolling window centred on today (3 back, today, 3 ahead) so the chart
  // shows history plus projection instead of an empty fresh week. With no
  // forecast to draw ahead, fall back to the trailing 7 days of history.
  const today = weekDatesThroughToday[weekDatesThroughToday.length - 1] ?? weekMonday;
  const centeredDates = heroChartWindowInVenue(args.timezone, today).dates;
  const forecastMap = args.revenueForecastCentsByDate ?? {};
  const hasFutureForecast = centeredDates.some(
    (date) => date > today && forecastMap[date] !== undefined,
  );
  const chartDates = hasFutureForecast
    ? centeredDates
    : listCalendarDatesBetween(addDaysCalendarIso(today, -6), today);

  // Today only joins the actual line once it has trade; before open the
  // line ends on yesterday and the chart's pulsing dot marks the frontier.
  const todayHasTrade = (byDate.get(today)?.ordersCount ?? 0) > 0;

  const netRevenueSeries: DashboardNetRevenuePoint[] = chartDates.map(
    (date) => {
      const forecastCents = forecastMap[date];
      const revenue =
        date < today
          ? (byDate.get(date)?.revenueCents ?? 0) / 100
          : date === today && todayHasTrade
            ? (byDate.get(date)?.revenueCents ?? 0) / 100
            : null;
      return {
        label: date === today ? "Today" : weekdayShortLabel(date),
        revenue,
        forecast: forecastCents !== undefined ? forecastCents / 100 : null,
      };
    },
  );

  // Trading days across both fetched weeks (prev Monday → today), oldest first.
  const throughDate = weekDatesThroughToday[weekDatesThroughToday.length - 1] ?? weekMonday;
  const avgCheckSparkPoints = daily
    .filter(
      (day) =>
        day.date >= prevWeekMonday &&
        day.date <= throughDate &&
        day.ordersCount > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      label: sparkDayLabel(day.date),
      value: day.avgCheckCents / 100,
    }));

  const avgCheckKpi: DashboardKpiData = {
    id: "avg-check",
    title: "Avg Check",
    value: formatAudFromCents(thisAvgCheckCents),
    countUpEnd: thisAvgCheckCents / 100,
    countUpDecimals: 2,
    countUpPrefix: "$",
    status: "good",
    deltaPercent: avgCheckDelta.deltaPercent,
    deltaDirection: avgCheckDelta.deltaDirection,
    comparisonLabel: "vs same days last week",
    previousWeekDisplay: formatAudFromCents(prevAvgCheckCents),
    sparkline:
      avgCheckSparkPoints.length >= 3
        ? {
            kind: "area",
            label: "Avg check",
            format: "currency",
            points: avgCheckSparkPoints,
          }
        : undefined,
  };

  return {
    dataSource: "square",
    hero,
    netRevenueSeries,
    avgCheckKpi,
  };
}

export { dashboardSalesFetchIsoRange };
