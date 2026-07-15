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
import {
  weatherMultiplierForDate,
  type ForecastWeatherContext,
} from "@/server/weather/weather-multipliers";
import {
  calendarSignalForDate,
  type ForecastCalendarContext,
} from "@/server/calendar/calendar-multipliers";
import {
  closureDates,
  eventFlagsForDate,
  hasUncertaintyEvent,
  isClosedOn,
  levelShiftFloor,
  promoMultiplierForDate,
  type ForecastEventContext,
} from "@/server/forecast/forecast-events";

const HORIZON_DAYS = 14;
const BASELINE_WEEKDAY_SAMPLES = 8;
/** How much wider the band gets on days with a less-predictable operator event (promo / one-off). */
const EVENT_BAND_WIDEN_FACTOR = 1.5;

/** Later of two optional ISO date floors (both are inclusive lower bounds on usable history). */
function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}
/**
 * Same-weekday samples below this fraction of the trailing median are treated as data
 * anomalies (soft-opening days, POS outages, half-days) and excluded from the baseline,
 * so a single broken day cannot poison a weekday's forecast for weeks.
 */
const BASELINE_MIN_FRACTION_OF_MEDIAN = 0.4;
/** Trailing window (days) for the fresh, trend-tracking level estimate. */
const TREND_LEVEL_WINDOW_DAYS = 21;
/** Trailing window (days) used as the level denominator when fitting day-of-week factors. */
const DOW_FACTOR_LEVEL_WINDOW = 28;
/** A weekday factor needs at least this many prior days of level before it is trusted. */
const DOW_FACTOR_MIN_WINDOW = 7;
/** Weight given to the trend-tracking baseline once enough history exists; rest is same-weekday. */
const TREND_BLEND_WEIGHT = 0.5;
/**
 * Below this many history days the day-of-week profile is too thin to trust, so the forecast stays
 * on the pure same-weekday baseline (which is more robust cold-start). Above it, blend the trend in.
 */
const TREND_MIN_HISTORY_DAYS = 28;

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

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
    : sorted[mid] ?? 0;
}

/**
 * Lower bound below which a same-weekday sample is an anomaly, not signal: a fraction of the
 * trailing median of all prior trading days for this metric. Zero when there is no history yet.
 */
function anomalyFloorForMetric(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null
): number {
  const priorValues = history
    .filter((row) => {
      if (row.date >= targetDateIso) {
        return false;
      }
      if (dataStartsFrom && row.date < dataStartsFrom) {
        return false;
      }
      return metricValue(row, metric) > 0;
    })
    .map((row) => metricValue(row, metric));

  return median(priorValues) * BASELINE_MIN_FRACTION_OF_MEDIAN;
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

  // Drop anomalous low-volume days (soft-opening, outages) so they don't poison the baseline.
  // Fall back to the unguarded pool if the guard would remove every sample.
  const floor = anomalyFloorForMetric(
    history,
    targetDateIso,
    metric,
    dataStartsFrom
  );
  const guarded = eligible.filter((row) => metricValue(row, metric) >= floor);
  const pool = guarded.length > 0 ? guarded : eligible;

  const sorted = [...pool].sort((a, b) => b.date.localeCompare(a.date));
  const sample = sorted.slice(0, BASELINE_WEEKDAY_SAMPLES);
  if (sample.length === 0) {
    return { baseline: 0, sampleCount: 0 };
  }

  const sum = sample.reduce((acc, row) => acc + metricValue(row, metric), 0);
  return { baseline: sum / sample.length, sampleCount: sample.length };
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((acc, v) => acc + v, 0) / values.length
    : 0;
}

/** Prior trading days (strictly before the target, within `dataStartsFrom`) with the anomaly guard applied. */
function cleanPriorRows(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null
): DailySalesAggregate[] {
  const floor = anomalyFloorForMetric(
    history,
    targetDateIso,
    metric,
    dataStartsFrom
  );
  return history.filter((row) => {
    if (row.date >= targetDateIso) {
      return false;
    }
    if (dataStartsFrom && row.date < dataStartsFrom) {
      return false;
    }
    const value = metricValue(row, metric);
    return value > 0 && value >= floor;
  });
}

/**
 * Multiplicative day-of-week profile, normalised to average 1 across the week. Each clean day is
 * expressed as a ratio to its own trailing level, then the median ratio per weekday is taken, so a
 * Saturday is measured against the venue's level at that time rather than against slower weekdays.
 */
function dayOfWeekFactors(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null
): Record<number, number> {
  const clean = cleanPriorRows(history, targetDateIso, metric, dataStartsFrom).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const ratiosByDow = new Map<number, number[]>();
  for (let i = 0; i < clean.length; i += 1) {
    const row = clean[i];
    if (!row) {
      continue;
    }
    const window = clean.slice(0, i).slice(-DOW_FACTOR_LEVEL_WINDOW);
    if (window.length < DOW_FACTOR_MIN_WINDOW) {
      continue;
    }
    const level = average(window.map((r) => metricValue(r, metric)));
    if (level <= 0) {
      continue;
    }
    const dow = dayOfWeekUtc(row.date);
    const list = ratiosByDow.get(dow) ?? [];
    list.push(metricValue(row, metric) / level);
    ratiosByDow.set(dow, list);
  }

  const factors: Record<number, number> = {};
  for (let d = 0; d < 7; d += 1) {
    const list = ratiosByDow.get(d);
    factors[d] = list && list.length > 0 ? median(list) : 1;
  }
  const avg = average(Object.values(factors));
  if (avg > 0) {
    for (let d = 0; d < 7; d += 1) {
      factors[d] = (factors[d] ?? 1) / avg;
    }
  }
  return factors;
}

/**
 * Trend-tracking baseline: a fresh trailing level (last {@link TREND_LEVEL_WINDOW_DAYS} clean days,
 * deseasonalised by the day-of-week profile) re-seasonalised onto the target weekday. Unlike the
 * same-weekday mean — whose eight samples span eight weeks — this reflects the venue's *current*
 * level, so it does not lag a rising or falling trend.
 */
function trendLevelBaseline(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null,
  factors: Record<number, number>
): number {
  const recent = cleanPriorRows(history, targetDateIso, metric, dataStartsFrom)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, TREND_LEVEL_WINDOW_DAYS);
  if (recent.length === 0) {
    return 0;
  }
  const deseasonalised = recent.map((row) => {
    const factor = factors[dayOfWeekUtc(row.date)] ?? 1;
    return factor > 0 ? metricValue(row, metric) / factor : metricValue(row, metric);
  });
  const targetFactor = factors[dayOfWeekUtc(targetDateIso)] ?? 1;
  return average(deseasonalised) * targetFactor;
}

/** Weight the trend-tracking baseline gets; zero until there is enough history to trust a profile. */
function trendBlendWeight(availableHistoryDays: number): number {
  return availableHistoryDays >= TREND_MIN_HISTORY_DAYS ? TREND_BLEND_WEIGHT : 0;
}

/**
 * Blend the robust same-weekday baseline with the trend-tracking baseline. Falls back to pure
 * same-weekday when the trend weight is zero (cold start) or either estimate is unavailable.
 */
function computeBaseline(
  history: DailySalesAggregate[],
  targetDateIso: string,
  metric: ForecastMetric,
  dataStartsFrom: string | null,
  trendWeight: number
): { baseline: number; sampleCount: number; trendLevel: number | null } {
  const sameWeekday = averageSameWeekdayBaseline(
    history,
    targetDateIso,
    metric,
    dataStartsFrom
  );
  if (trendWeight <= 0 || sameWeekday.baseline <= 0) {
    return { ...sameWeekday, trendLevel: null };
  }

  const factors = dayOfWeekFactors(history, targetDateIso, metric, dataStartsFrom);
  const trendLevel = trendLevelBaseline(
    history,
    targetDateIso,
    metric,
    dataStartsFrom,
    factors
  );
  if (trendLevel <= 0) {
    return { ...sameWeekday, trendLevel: null };
  }

  const blended =
    (1 - trendWeight) * sameWeekday.baseline + trendWeight * trendLevel;
  return {
    baseline: blended,
    sampleCount: sameWeekday.sampleCount,
    trendLevel,
  };
}

function buildInputs(
  baseline: number,
  sampleCount: number,
  weather: { multiplier: number; bucket: string | null },
  trend: { level: number | null; weight: number },
  calendar: {
    multiplier: number;
    holidayName: string | null;
    schoolHoliday: boolean;
  },
  events: {
    multiplier: number;
    closed: boolean;
    flags: Array<{ kind: string; title: string }>;
  }
): ForecastInputs {
  return {
    baseline,
    trendMultiplier: 1,
    monthlySeasonalityMultiplier: 1,
    holidayMultiplier: calendar.multiplier,
    schoolHolidayMultiplier: 1,
    weatherMultiplier: weather.multiplier,
    ...(weather.bucket ? { weatherBucket: weather.bucket } : {}),
    sameWeekdaySampleCount: sampleCount,
    ...(trend.level !== null
      ? { trendLevelBaseline: trend.level, trendBlendWeight: trend.weight }
      : {}),
    ...(calendar.holidayName
      ? { publicHolidayName: calendar.holidayName }
      : {}),
    ...(calendar.schoolHoliday ? { schoolHoliday: true } : {}),
    ...(events.multiplier !== 1 ? { eventMultiplier: events.multiplier } : {}),
    ...(events.closed ? { closed: true } : {}),
    ...(events.flags.length > 0 ? { events: events.flags } : {}),
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

/**
 * Minimum residuals to trust a distribution. A weekday uses its own residuals only when it has this
 * many; otherwise it pools all weekdays. Below this even pooled, we fall back to the fixed spread.
 */
const MIN_RESIDUALS_POOL = 10;
/** A residual only counts if its baseline rests on at least this many same-weekday samples. */
const MIN_RESIDUAL_BASELINE_SAMPLES = 4;
/**
 * Empirical band edges on the residual distribution. Set wider than a nominal 80% (0.1/0.9) because
 * the point forecast the band wraps is not the exact same-weekday baseline the residuals are
 * measured against, and the sample is small; 0.05/0.95 gives ~80% real coverage in the backtest.
 */
const BAND_LOWER_QUANTILE = 0.05;
const BAND_UPPER_QUANTILE = 0.95;

type ResidualModel = { byWeekday: Map<number, number[]>; all: number[] };

function quantile(sortedAscending: number[], p: number): number {
  if (sortedAscending.length === 0) {
    return 0;
  }
  if (sortedAscending.length === 1) {
    return sortedAscending[0] ?? 0;
  }
  const idx = p * (sortedAscending.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return (sortedAscending[lo] ?? 0) * (1 - frac) + (sortedAscending[hi] ?? 0) * frac;
}

/**
 * Point-in-time distribution of the same-weekday baseline's *percentage* error over history, so the
 * forecast band reflects the venue's real day-to-day volatility (wide Saturdays, tight Tuesdays)
 * instead of a one-size spread. Residuals are grouped by weekday; the baseline for each historical
 * day uses only data before that day, so there is no look-ahead.
 */
function buildResidualModel(
  history: DailySalesAggregate[],
  metric: ForecastMetric,
  dataStartsFrom: string | null,
  beforeDateExclusive: string
): ResidualModel {
  const byWeekday = new Map<number, number[]>();
  const all: number[] = [];
  for (const row of history) {
    if (row.date >= beforeDateExclusive) {
      continue;
    }
    if (dataStartsFrom && row.date < dataStartsFrom) {
      continue;
    }
    const actual = metricValue(row, metric);
    if (actual <= 0) {
      continue;
    }
    const { baseline, sampleCount } = averageSameWeekdayBaseline(
      history,
      row.date,
      metric,
      dataStartsFrom
    );
    // Skip thin-history days: a baseline off one or two samples yields wild residuals that
    // fatten the tails one-sidedly and blow the band width out without improving coverage.
    if (baseline <= 0 || sampleCount < MIN_RESIDUAL_BASELINE_SAMPLES) {
      continue;
    }
    const residual = actual / baseline - 1;
    all.push(residual);
    const dow = dayOfWeekUtc(row.date);
    const list = byWeekday.get(dow) ?? [];
    list.push(residual);
    byWeekday.set(dow, list);
  }
  return { byWeekday, all };
}

/**
 * Empirical P10/P90 band around the forecast for the target weekday, falling back to the fixed
 * confidence spread when there are too few residuals. The point stays inside the band for display.
 */
function empiricalBounds(
  model: ResidualModel,
  targetDateIso: string,
  value: number,
  confidence: NonNullable<ReturnType<typeof confidenceFromHistoryDays>>,
  widenFactor = 1
): { lower: number; upper: number } {
  const weekday = model.byWeekday.get(dayOfWeekUtc(targetDateIso)) ?? [];
  const pool = weekday.length >= MIN_RESIDUALS_POOL ? weekday : model.all;
  if (pool.length < MIN_RESIDUALS_POOL) {
    const base = confidenceBounds(value, confidence);
    if (widenFactor === 1) {
      return base;
    }
    return {
      lower: Math.max(0, Math.round(value - (value - base.lower) * widenFactor)),
      upper: Math.round(value + (base.upper - value) * widenFactor),
    };
  }
  const sorted = [...pool].sort((a, b) => a - b);
  const lowerResidual = Math.min(0, quantile(sorted, BAND_LOWER_QUANTILE)) * widenFactor;
  const upperResidual = Math.max(0, quantile(sorted, BAND_UPPER_QUANTILE)) * widenFactor;
  return {
    lower: Math.max(0, Math.round(value * (1 + lowerResidual))),
    upper: Math.round(value * (1 + upperResidual)),
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
  weather?: ForecastWeatherContext;
  calendar?: ForecastCalendarContext;
  events?: ForecastEventContext;
}): ForecastRow[] {
  const historyBefore = args.history.filter((row) => row.date < args.targetDateIso);
  const availableDays = countDistinctHistoryDays(historyBefore.map((row) => row.date));
  const confidence = confidenceFromHistoryDays(availableDays);

  if (!confidence) {
    return [];
  }

  const dataStartsFrom = args.dataStartsFrom ?? null;
  const trendWeight = trendBlendWeight(availableDays);
  const rows: ForecastRow[] = [];

  // Operator events: drop closed days from baselines; apply a level-shift floor for price/menu
  // changes; force a zero forecast on closures; multiply and widen for promotions/one-off events.
  const closures = closureDates(args.events);
  const tradingHistory =
    closures.size > 0
      ? historyBefore.filter((row) => !closures.has(row.date))
      : historyBefore;
  const closed = isClosedOn(args.events, args.targetDateIso);
  const effectiveStart = laterDate(
    dataStartsFrom,
    levelShiftFloor(args.events, args.targetDateIso)
  );
  const eventFlags = eventFlagsForDate(args.events, args.targetDateIso);
  const widenFactor = hasUncertaintyEvent(args.events, args.targetDateIso)
    ? EVENT_BAND_WIDEN_FACTOR
    : 1;

  for (const metric of METRICS) {
    const { baseline, sampleCount, trendLevel } = computeBaseline(
      tradingHistory,
      args.targetDateIso,
      metric,
      effectiveStart,
      trendWeight
    );
    const weather = weatherMultiplierForDate(
      args.weather,
      args.targetDateIso,
      metric
    );
    const calendar = calendarSignalForDate(
      args.calendar,
      args.targetDateIso,
      metric
    );
    const eventMultiplier =
      metric === "avg_check"
        ? 1
        : promoMultiplierForDate(args.events, args.targetDateIso);
    const inputs = buildInputs(
      baseline,
      sampleCount,
      weather,
      { level: trendLevel, weight: trendWeight },
      calendar,
      { multiplier: eventMultiplier, closed, flags: eventFlags }
    );
    const raw = closed ? 0 : applyMultipliers(baseline, inputs) * eventMultiplier;
    const forecastValue = roundMetricValue(metric, raw);
    const residualModel = buildResidualModel(
      tradingHistory,
      metric,
      effectiveStart,
      args.targetDateIso
    );
    const bounds = closed
      ? { lower: 0, upper: 0 }
      : empiricalBounds(
          residualModel,
          args.targetDateIso,
          forecastValue,
          confidence,
          widenFactor
        );

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
  weather?: ForecastWeatherContext;
  calendar?: ForecastCalendarContext;
  events?: ForecastEventContext;
}): ForecastRow[] {
  const dates = listCalendarDatesBetween(args.fromDate, args.toDate);
  const rows: ForecastRow[] = [];

  for (const date of dates) {
    rows.push(
      ...computeForecastForDate({
        history: args.history,
        targetDateIso: date,
        dataStartsFrom: args.dataStartsFrom,
        weather: args.weather,
        calendar: args.calendar,
        events: args.events,
      })
    );
  }

  return rows;
}

/**
 * Generate forward forecasts from historical daily_sales (Notion multiplicative model).
 * Weather is the first live multiplier (via `weather`); the rest remain fixed at 1.
 */
export function computeForecasts(args: {
  history: DailySalesAggregate[];
  todayIso: string;
  dataStartsFrom?: string | null;
  horizonDays?: number;
  weather?: ForecastWeatherContext;
  calendar?: ForecastCalendarContext;
  events?: ForecastEventContext;
}): ForecastRow[] {
  const horizon = args.horizonDays ?? HORIZON_DAYS;
  const historyDates = args.history.map((h) => h.date);
  const availableDays = new Set(historyDates).size;
  const confidence = confidenceFromHistoryDays(availableDays);

  if (!confidence) {
    return [];
  }

  const dataStartsFrom = args.dataStartsFrom ?? null;
  const trendWeight = trendBlendWeight(availableDays);
  const rows: ForecastRow[] = [];

  // Closed days are not normal trading, so drop them from every baseline and the residual model.
  const closures = closureDates(args.events);
  const tradingHistory =
    closures.size > 0
      ? args.history.filter((row) => !closures.has(row.date))
      : args.history;

  // Residual distribution is the same for every forward day (same history), so build it once.
  const residualModels = new Map<ForecastMetric, ResidualModel>();
  for (const metric of METRICS) {
    residualModels.set(
      metric,
      buildResidualModel(tradingHistory, metric, dataStartsFrom, args.todayIso)
    );
  }

  for (let i = 0; i < horizon; i += 1) {
    const date = addDaysCalendarIso(args.todayIso, i);
    const closed = isClosedOn(args.events, date);
    const effectiveStart = laterDate(dataStartsFrom, levelShiftFloor(args.events, date));
    const eventFlags = eventFlagsForDate(args.events, date);
    const widenFactor = hasUncertaintyEvent(args.events, date)
      ? EVENT_BAND_WIDEN_FACTOR
      : 1;

    for (const metric of METRICS) {
      const { baseline, sampleCount, trendLevel } = computeBaseline(
        tradingHistory,
        date,
        metric,
        effectiveStart,
        trendWeight
      );
      const weather = weatherMultiplierForDate(args.weather, date, metric);
      const calendar = calendarSignalForDate(args.calendar, date, metric);
      const eventMultiplier =
        metric === "avg_check" ? 1 : promoMultiplierForDate(args.events, date);
      const inputs = buildInputs(
        baseline,
        sampleCount,
        weather,
        { level: trendLevel, weight: trendWeight },
        calendar,
        { multiplier: eventMultiplier, closed, flags: eventFlags }
      );
      const raw = closed ? 0 : applyMultipliers(baseline, inputs) * eventMultiplier;
      const forecastValue = roundMetricValue(metric, raw);
      const model = residualModels.get(metric);
      const bounds = closed
        ? { lower: 0, upper: 0 }
        : model
          ? empiricalBounds(model, date, forecastValue, confidence, widenFactor)
          : confidenceBounds(forecastValue, confidence);

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
