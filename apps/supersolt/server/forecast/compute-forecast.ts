import { addDaysCalendarIso, listCalendarDatesBetween } from "@/lib/date/calendar-iso";
import {
  confidenceFromHistoryDays,
  countDistinctHistoryDays,
} from "@/server/forecast/forecast-confidence";
import type {
  DailySalesAggregate,
  ForecastInputs,
  ForecastMetric,
  ForecastRow,
} from "@/server/forecast/types";

const HORIZON_DAYS = 14;
const BASELINE_WEEKDAY_SAMPLES = 8;

function metricValue(day: DailySalesAggregate, metric: ForecastMetric): number {
  switch (metric) {
    case "revenue":
      return day.revenueCents;
    case "orders":
      return day.ordersCount;
    case "avg_check":
      return day.avgCheckCents;
    default: {
      const never: never = metric;
      return never;
    }
  }
}

function dayOfWeekUtc(isoDate: string): number {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)).getUTCDay();
}

function averageSameWeekdayBaseline(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null
): { baseline: number; sampleCount: number } {
  const targetDow = dayOfWeekUtc(targetDateIso);
  const eligible = history.filter((row) => {
    if (row.date >= targetDateIso) {
      return false;
    }
    if (dataStartsFrom && row.date < dataStartsFrom) {
      return false;
    }
    return dayOfWeekUtc(row.date) === targetDow;
  });

  const sorted = [...eligible].sort((a, b) => b.date.localeCompare(a.date));
  const sample = sorted.slice(0, BASELINE_WEEKDAY_SAMPLES);
  if (sample.length === 0) {
    return { baseline: 0, sampleCount: 0 };
  }

  const sum = sample.reduce((acc, row) => acc + metricValue(row, metric), 0);
  return { baseline: sum / sample.length, sampleCount: sample.length };
}

function buildInputs(
  baseline: number,
  sampleCount: number
): ForecastInputs {
  return {
    baseline,
    trendMultiplier: 1,
    monthlySeasonalityMultiplier: 1,
    holidayMultiplier: 1,
    schoolHolidayMultiplier: 1,
    weatherMultiplier: 1,
    sameWeekdaySampleCount: sampleCount,
  };
}

function applyMultipliers(baseline: number, inputs: ForecastInputs): number {
  return (
    baseline *
    inputs.trendMultiplier *
    inputs.monthlySeasonalityMultiplier *
    inputs.holidayMultiplier *
    inputs.schoolHolidayMultiplier *
    inputs.weatherMultiplier
  );
}

function roundMetricValue(metric: ForecastMetric, value: number): number {
  if (metric === "orders") {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round(value));
}

function confidenceBounds(
  value: number,
  confidence: NonNullable<ReturnType<typeof confidenceFromHistoryDays>>
): { lower: number; upper: number } {
  const spread =
    confidence === "low" ? 0.2 : confidence === "medium" ? 0.12 : 0.08;
  return {
    lower: Math.round(value * (1 - spread)),
    upper: Math.round(value * (1 + spread)),
  };
}

const METRICS: ForecastMetric[] = ["revenue", "orders", "avg_check"];

/**
 * Point-in-time forecast for `targetDateIso`: uses only `daily_sales` strictly before that date
 * (what we would have predicted that morning).
 */
export function computeForecastForDate(args: {
  history: DailySalesAggregate[];
  targetDateIso: string;
  dataStartsFrom?: string | null;
}): ForecastRow[] {
  const historyBefore = args.history.filter((row) => row.date < args.targetDateIso);
  const availableDays = countDistinctHistoryDays(historyBefore.map((row) => row.date));
  const confidence = confidenceFromHistoryDays(availableDays);

  if (!confidence) {
    return [];
  }

  const dataStartsFrom = args.dataStartsFrom ?? null;
  const rows: ForecastRow[] = [];

  for (const metric of METRICS) {
    const { baseline, sampleCount } = averageSameWeekdayBaseline(
      historyBefore,
      args.targetDateIso,
      metric,
      dataStartsFrom
    );
    const inputs = buildInputs(baseline, sampleCount);
    const raw = applyMultipliers(baseline, inputs);
    const forecastValue = roundMetricValue(metric, raw);
    const bounds = confidenceBounds(forecastValue, confidence);

    rows.push({
      date: args.targetDateIso,
      metric,
      forecastValue,
      confidence,
      confidenceLowerBound: bounds.lower,
      confidenceUpperBound: bounds.upper,
      inputs,
    });
  }

  return rows;
}

/**
 * Backcast (and forward) forecasts for each day in [fromDate, toDate] using history available before each day.
 */
export function computeForecastsForDateRange(args: {
  history: DailySalesAggregate[];
  fromDate: string;
  toDate: string;
  dataStartsFrom?: string | null;
}): ForecastRow[] {
  const dates = listCalendarDatesBetween(args.fromDate, args.toDate);
  const rows: ForecastRow[] = [];

  for (const date of dates) {
    rows.push(
      ...computeForecastForDate({
        history: args.history,
        targetDateIso: date,
        dataStartsFrom: args.dataStartsFrom,
      })
    );
  }

  return rows;
}

/**
 * Generate forward forecasts from historical daily_sales (Notion multiplicative model — MVP multipliers fixed at 1).
 */
export function computeForecasts(args: {
  history: DailySalesAggregate[];
  todayIso: string;
  dataStartsFrom?: string | null;
  horizonDays?: number;
}): ForecastRow[] {
  const horizon = args.horizonDays ?? HORIZON_DAYS;
  const historyDates = args.history.map((h) => h.date);
  const availableDays = new Set(historyDates).size;
  const confidence = confidenceFromHistoryDays(availableDays);

  if (!confidence) {
    return [];
  }

  const dataStartsFrom = args.dataStartsFrom ?? null;
  const rows: ForecastRow[] = [];

  for (let i = 0; i < horizon; i += 1) {
    const date = addDaysCalendarIso(args.todayIso, i);

    for (const metric of METRICS) {
      const { baseline, sampleCount } = averageSameWeekdayBaseline(
        args.history,
        date,
        metric,
        dataStartsFrom
      );
      const inputs = buildInputs(baseline, sampleCount);
      const raw = applyMultipliers(baseline, inputs);
      const forecastValue = roundMetricValue(metric, raw);
      const bounds = confidenceBounds(forecastValue, confidence);

      rows.push({
        date,
        metric,
        forecastValue,
        confidence,
        confidenceLowerBound: bounds.lower,
        confidenceUpperBound: bounds.upper,
        inputs,
      });
    }
  }

  return rows;
}
