import type { DailySalesRow, ForecastMetric, ForecastRow } from "@/entities/forecast/model/types";
import type { WeatherIconKind } from "@/entities/weather/lib/weather-icon-kind";

export type ChartPointWeather = {
  kind: WeatherIconKind;
  /** Rounded daily max, degrees Celsius. */
  tempMaxC: number | null;
  /** Human summary for tooltips, e.g. "Rain · 14°". */
  label: string;
};

export type SalesVsForecastChartPoint = {
  date: string;
  label: string;
  actual: number | null;
  forecast: number | null;
  weather?: ChartPointWeather;
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
  dates: string[],
  weatherByDate?: Map<string, ChartPointWeather>
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
    const weather = weatherByDate?.get(date);
    return {
      date,
      label: shortChartLabel(date),
      actual: sales ? sales.revenueCents / 100 : null,
      forecast:
        forecastCents !== undefined ? forecastCents / 100 : null,
      ...(weather ? { weather } : {}),
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

/**
 * Positive framing of a forecast miss: 100% minus the absolute delta, floored
 * at 0 (a 9.2% miss in either direction reads as 90.8% forecast accuracy).
 */
export function forecastAccuracyPct(delta: ForecastDelta): number {
  return Math.max(0, 100 - Math.abs(delta.pct));
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

// ---------------------------------------------------------------------------
// Forecast tab: forward outlook + accuracy scoring
// ---------------------------------------------------------------------------

export type ForecastDriverChip = {
  key: string;
  label: string;
  /** Direction the driver pushes the forecast: lifts, drags, or informational. */
  tone: "up" | "down" | "neutral";
};

export type ForecastOutlookDay = {
  date: string;
  /** Short chart/table label, e.g. "15 Jul". */
  label: string;
  weekday: string;
  isToday: boolean;
  revenueCents: number;
  revenueLowerCents: number | null;
  revenueUpperCents: number | null;
  orders: number | null;
  avgCheckCents: number | null;
  confidence: "low" | "medium" | "high";
  closed: boolean;
  drivers: ForecastDriverChip[];
  weather?: ChartPointWeather;
};

function weekdayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", { weekday: "long" }).format(
    parseCalendarDate(iso)
  );
}

function multiplierPctLabel(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
}

function multiplierTone(multiplier: number): ForecastDriverChip["tone"] {
  if (multiplier > 1.005) {
    return "up";
  }
  if (multiplier < 0.995) {
    return "down";
  }
  return "neutral";
}

function humanizeToken(token: string): string {
  const spaced = token.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Display chips for everything nudging one day's forecast away from its baseline. */
export function forecastDriverChips(inputs: ForecastRow["inputs"]): ForecastDriverChip[] {
  const chips: ForecastDriverChip[] = [];

  if (inputs.closed) {
    chips.push({ key: "closed", label: "Closed", tone: "down" });
  }

  if (inputs.weatherMultiplier !== 1) {
    const bucket = inputs.weatherBucket
      ? humanizeToken(inputs.weatherBucket)
      : "Weather";
    chips.push({
      key: "weather",
      label: `${bucket} ${multiplierPctLabel(inputs.weatherMultiplier)}`,
      tone: multiplierTone(inputs.weatherMultiplier),
    });
  }

  if (inputs.publicHolidayName) {
    const suffix =
      inputs.holidayMultiplier !== 1
        ? ` ${multiplierPctLabel(inputs.holidayMultiplier)}`
        : "";
    chips.push({
      key: "holiday",
      label: `${inputs.publicHolidayName}${suffix}`,
      tone:
        inputs.holidayMultiplier !== 1
          ? multiplierTone(inputs.holidayMultiplier)
          : "neutral",
    });
  } else if (inputs.holidayMultiplier !== 1) {
    chips.push({
      key: "holiday",
      label: `Holiday ${multiplierPctLabel(inputs.holidayMultiplier)}`,
      tone: multiplierTone(inputs.holidayMultiplier),
    });
  }

  if (inputs.schoolHoliday) {
    chips.push({ key: "school", label: "School holidays", tone: "neutral" });
  }

  for (const [index, event] of (inputs.events ?? []).entries()) {
    // The lift chip belongs on the promo/event that carries the multiplier;
    // level-shift kinds (price/menu change) are informational.
    const carriesLift =
      (event.kind === "promotion" || event.kind === "event") &&
      inputs.eventMultiplier !== undefined &&
      inputs.eventMultiplier !== 1;
    chips.push({
      key: `event-${index}`,
      label: carriesLift
        ? `${event.title} ${multiplierPctLabel(inputs.eventMultiplier ?? 1)}`
        : event.title,
      tone: carriesLift ? multiplierTone(inputs.eventMultiplier ?? 1) : "neutral",
    });
  }

  return chips;
}

/** One outlook row per date that has a revenue forecast, in date order. */
export function buildForecastOutlookDays(
  forecasts: ForecastRow[],
  dates: string[],
  todayIso: string,
  weatherByDate?: Map<string, ChartPointWeather>
): ForecastOutlookDay[] {
  const byDate = new Map<string, Map<ForecastMetric, ForecastRow>>();
  for (const row of forecasts) {
    const metrics = byDate.get(row.date) ?? new Map<ForecastMetric, ForecastRow>();
    metrics.set(row.metric, row);
    byDate.set(row.date, metrics);
  }

  const days: ForecastOutlookDay[] = [];
  for (const date of dates) {
    const metrics = byDate.get(date);
    const revenue = metrics?.get("revenue");
    if (!revenue) {
      continue;
    }
    const orders = metrics?.get("orders");
    const avgCheck = metrics?.get("avg_check");
    const weather = weatherByDate?.get(date);
    days.push({
      date,
      label: shortChartLabel(date),
      weekday: weekdayLabel(date),
      isToday: date === todayIso,
      revenueCents: revenue.forecastValue,
      revenueLowerCents: revenue.confidenceLowerBound,
      revenueUpperCents: revenue.confidenceUpperBound,
      orders: orders ? orders.forecastValue : null,
      avgCheckCents: avgCheck ? avgCheck.forecastValue : null,
      confidence: revenue.confidence,
      closed: revenue.inputs.closed === true,
      drivers: forecastDriverChips(revenue.inputs),
      ...(weather ? { weather } : {}),
    });
  }
  return days;
}

export type ForecastAccuracyDay = {
  date: string;
  label: string;
  weekday: string;
  actualCents: number;
  forecastCents: number;
  /** Signed miss, actual vs forecast (+ means the venue beat the forecast). */
  deltaPct: number;
  /** Whether the actual landed inside the confidence band; null without bounds. */
  withinBand: boolean | null;
  drivers: ForecastDriverChip[];
};

export type ForecastAccuracySummary = {
  days: ForecastAccuracyDay[];
  comparedDays: number;
  /** 100 − WAPE across compared days (weighted, so big days count more). */
  overallAccuracyPct: number | null;
  /** Median of per-day accuracy, robust to one blown day. */
  medianDailyAccuracyPct: number | null;
  /** Share of compared days whose actual landed inside the confidence band. */
  withinBandPct: number | null;
  /** Compared days sorted by |miss|, largest first. */
  biggestMisses: ForecastAccuracyDay[];
};

function medianOf(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : (sorted[mid] ?? 0);
}

/**
 * Scores the backcast against actuals for every day in `dates` that has both a
 * synced actual and a revenue forecast. Days forecast as closed are skipped:
 * a forced zero is a calendar fact, not a model result.
 */
export function summarizeForecastAccuracy(
  dailySales: DailySalesRow[],
  forecasts: ForecastRow[],
  dates: string[]
): ForecastAccuracySummary {
  const dateSet = new Set(dates);
  const salesByDate = new Map(dailySales.map((row) => [row.date, row]));
  const revenueByDate = new Map<string, ForecastRow>();
  for (const row of forecasts) {
    if (row.metric === "revenue" && dateSet.has(row.date)) {
      revenueByDate.set(row.date, row);
    }
  }

  const days: ForecastAccuracyDay[] = [];
  for (const [date, forecast] of revenueByDate) {
    const sales = salesByDate.get(date);
    if (!sales || forecast.forecastValue <= 0 || forecast.inputs.closed) {
      continue;
    }
    const actualCents = sales.revenueCents;
    const deltaPct =
      ((actualCents - forecast.forecastValue) / forecast.forecastValue) * 100;
    const withinBand =
      forecast.confidenceLowerBound !== null &&
      forecast.confidenceUpperBound !== null
        ? actualCents >= forecast.confidenceLowerBound &&
          actualCents <= forecast.confidenceUpperBound
        : null;
    days.push({
      date,
      label: shortChartLabel(date),
      weekday: weekdayLabel(date),
      actualCents,
      forecastCents: forecast.forecastValue,
      deltaPct,
      withinBand,
      drivers: forecastDriverChips(forecast.inputs),
    });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));

  const totalActual = days.reduce((sum, d) => sum + d.actualCents, 0);
  const totalAbsError = days.reduce(
    (sum, d) => sum + Math.abs(d.actualCents - d.forecastCents),
    0
  );
  const overallAccuracyPct =
    days.length > 0 && totalActual > 0
      ? Math.max(0, 100 - (totalAbsError / totalActual) * 100)
      : null;

  const medianDailyAccuracyPct = medianOf(
    days.map((d) => Math.max(0, 100 - Math.abs(d.deltaPct)))
  );

  const bandDays = days.filter((d) => d.withinBand !== null);
  const withinBandPct =
    bandDays.length > 0
      ? (bandDays.filter((d) => d.withinBand).length / bandDays.length) * 100
      : null;

  return {
    days,
    comparedDays: days.length,
    overallAccuracyPct,
    medianDailyAccuracyPct,
    withinBandPct,
    biggestMisses: [...days].sort(
      (a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct)
    ),
  };
}
