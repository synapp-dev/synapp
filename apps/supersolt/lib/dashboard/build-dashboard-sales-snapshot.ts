import type { SalesOrderRow } from "@/entities/sales-insights/model/types";
import type {
  DashboardHeroData,
  DashboardKpiData,
  DashboardNetRevenuePoint,
} from "@/entities/dashboard/model/dummy-dashboard-data";
import {
  dashboardSalesFetchIsoRange,
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

function formatAudFromCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

export function buildDashboardSalesSnapshot(args: {
  orders: SalesOrderRow[];
  timezone: string;
  /** Override for tests; defaults to today in the venue timezone. */
  todayIso?: string;
}): DashboardLiveSalesSlice {
  const daily = aggregateOrdersToDailySales(args.orders, args.timezone);
  const byDate = new Map(daily.map((row) => [row.date, row]));

  const {
    weekMonday,
    weekDatesThroughToday,
    fullWeekDates,
    weekdayLabels,
  } = thisWeekCalendarBoundsInVenue(args.timezone, args.todayIso);
  const { prevComparableDates } = previousComparableWeekDatesInVenue(
    weekMonday,
    weekDatesThroughToday,
  );

  const thisRevenueCents = sumForDates(byDate, weekDatesThroughToday, (d) => d.revenueCents);
  const prevRevenueCents = sumForDates(byDate, prevComparableDates, (d) => d.revenueCents);
  const thisOrders = sumForDates(byDate, weekDatesThroughToday, (d) => d.ordersCount);
  const prevOrders = sumForDates(byDate, prevComparableDates, (d) => d.ordersCount);

  const thisAvgCheckCents =
    thisOrders === 0 ? 0 : Math.round(thisRevenueCents / thisOrders);
  const prevAvgCheckCents =
    prevOrders === 0 ? 0 : Math.round(prevRevenueCents / prevOrders);

  const revenueDelta = pctDelta(thisRevenueCents, prevRevenueCents);
  const avgCheckDelta = pctDelta(thisAvgCheckCents, prevAvgCheckCents);

  const heroDollars = thisRevenueCents / 100;

  const hero: DashboardHeroData = {
    periodLabel: "This Week",
    metricLabel: "Net Revenue",
    value: formatAudFromCents(thisRevenueCents),
    countUpEnd: heroDollars,
    countUpDecimals: 2,
    deltaPercent: revenueDelta.deltaPercent,
    deltaDirection: revenueDelta.deltaDirection,
    comparisonLabel: "vs same days last week",
  };

  const netRevenueSeries: DashboardNetRevenuePoint[] = fullWeekDates.map(
    (date, index) => ({
      label: weekdayLabels[index] ?? date,
      revenue: (byDate.get(date)?.revenueCents ?? 0) / 100,
      expenses: 0,
    }),
  );

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
  };

  return {
    dataSource: "square",
    hero,
    netRevenueSeries,
    avgCheckKpi,
  };
}

export { dashboardSalesFetchIsoRange };
