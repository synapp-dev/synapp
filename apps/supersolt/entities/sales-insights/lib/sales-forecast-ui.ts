import type { DailySalesRow, ForecastMetric, ForecastRow } from "@/entities/forecast/model/types";

export type SalesVsForecastChartPoint = {
  date: string;
  label: string;
  actual: number | null;
  forecast: number | null;
};

export type ForecastPeriodTotals = {
  revenueCents: number;
  orders: number;
  avgCheckCents: number;
};

export type ForecastDelta = {
  pct: number;
  direction: "up" | "down" | "flat";
};

function parseCalendarDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function calendarDatesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function shortChartLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
  }).format(parseCalendarDate(iso));
}

function forecastValueForMetric(row: ForecastRow, metric: ForecastMetric): number {
  if (row.metric !== metric) {
    return 0;
  }
  return row.forecastValue;
}

/** Days in range that have synced daily_sales (excludes future / not-yet-imported days). */
export function comparableDatesWithActuals(
  dailySales: DailySalesRow[],
  dates: string[]
): string[] {
  const salesByDate = new Set(dailySales.map((row) => row.date));
  return dates.filter((date) => salesByDate.has(date));
}

export type ComparableForecastPeriod = {
  comparableDates: string[];
  actualRevenueCents: number;
  forecastRevenueCents: number;
  actualOrders: number;
  forecastOrders: number;
  actualAvgCheckCents: number;
  forecastAvgCheckCents: number;
};

/** Totals for KPI deltas — actual and forecast summed only on days with actuals. */
export function summarizeComparableForecastPeriod(
  dailySales: DailySalesRow[],
  forecasts: ForecastRow[],
  dates: string[]
): ComparableForecastPeriod {
  const comparableDates = comparableDatesWithActuals(dailySales, dates);
  const salesByDate = new Map(dailySales.map((row) => [row.date, row]));

  let actualRevenueCents = 0;
  let actualOrders = 0;

  for (const date of comparableDates) {
    const row = salesByDate.get(date);
    if (!row) {
      continue;
    }
    actualRevenueCents += row.revenueCents;
    actualOrders += row.ordersCount;
  }

  const actualAvgCheckCents =
    actualOrders === 0 ? 0 : Math.round(actualRevenueCents / actualOrders);

  return {
    comparableDates,
    actualRevenueCents,
    forecastRevenueCents: sumForecastInRange(forecasts, "revenue", comparableDates),
    actualOrders,
    forecastOrders: sumForecastInRange(forecasts, "orders", comparableDates),
    actualAvgCheckCents,
    forecastAvgCheckCents: Math.round(
      averageForecastInRange(forecasts, "avg_check", comparableDates)
    ),
  };
}

export function sumForecastInRange(
  forecasts: ForecastRow[],
  metric: ForecastMetric,
  dates: string[]
): number {
  const dateSet = new Set(dates);
  return forecasts.reduce((sum, row) => {
    if (!dateSet.has(row.date) || row.metric !== metric) {
      return sum;
    }
    return sum + forecastValueForMetric(row, metric);
  }, 0);
}

export function averageForecastInRange(
  forecasts: ForecastRow[],
  metric: ForecastMetric,
  dates: string[]
): number {
  const dateSet = new Set(dates);
  const values = forecasts
    .filter((row) => dateSet.has(row.date) && row.metric === metric)
    .map((row) => row.forecastValue);
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildSalesVsForecastChartPoints(
  dailySales: DailySalesRow[],
  forecasts: ForecastRow[],
  dates: string[]
): SalesVsForecastChartPoint[] {
  const salesByDate = new Map(dailySales.map((row) => [row.date, row]));
  const revenueForecastByDate = new Map<string, number>();
  for (const row of forecasts) {
    if (row.metric === "revenue") {
      revenueForecastByDate.set(row.date, row.forecastValue);
    }
  }

  return dates.map((date) => {
    const sales = salesByDate.get(date);
    const forecastCents = revenueForecastByDate.get(date);
    return {
      date,
      label: shortChartLabel(date),
      actual: sales ? sales.revenueCents / 100 : null,
      forecast:
        forecastCents !== undefined ? forecastCents / 100 : null,
    };
  });
}

export function chartHasForecastSeries(points: SalesVsForecastChartPoint[]): boolean {
  return points.some((point) => point.forecast !== null);
}

export function computeForecastDelta(
  actual: number,
  forecast: number
): ForecastDelta | null {
  if (forecast <= 0) {
    return null;
  }
  const pct = ((actual - forecast) / forecast) * 100;
  if (Math.abs(pct) < 0.05) {
    return { pct: 0, direction: "flat" };
  }
  return {
    pct,
    direction: pct > 0 ? "up" : "down",
  };
}

export function formatDeltaPercent(delta: ForecastDelta): string {
  const sign = delta.pct > 0 ? "+" : delta.pct < 0 ? "" : "";
  return `${sign}${delta.pct.toFixed(1)}% vs forecast`;
}

export function confidenceLabel(
  confidence: "low" | "medium" | "high" | null | undefined
): string | null {
  if (!confidence) {
    return null;
  }
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

export function maxConfidenceInRange(
  forecasts: ForecastRow[],
  dates: string[]
): "low" | "medium" | "high" | null {
  const dateSet = new Set(dates);
  if (dateSet.size === 0) {
    return null;
  }
  const order = { low: 1, medium: 2, high: 3 } as const;
  let best: keyof typeof order | null = null;

  for (const row of forecasts) {
    if (!dateSet.has(row.date)) {
      continue;
    }
    if (!best || order[row.confidence] > order[best]) {
      best = row.confidence;
    }
  }

  return best;
}

export function daysUntilForecastReady(availableHistoryDays: number): number {
  return Math.max(0, 14 - availableHistoryDays);
}
