import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";
import type { ForecastMetric } from "@/server/forecast/types";
import {
  WEATHER_BUCKETS,
  type WeatherBucket,
} from "@/server/weather/weather-buckets";

export type WeatherMultipliers = Record<
  ForecastMetric,
  Record<WeatherBucket, number>
>;

export type ForecastWeatherContext = {
  /** Bucket per ISO date, covering history (actuals) and forward days (forecast). */
  bucketsByDate: Record<string, WeatherBucket>;
  multipliers: WeatherMultipliers;
};

/** Below this many paired history days, weather effects are noise; use 1x everywhere. */
const MIN_PAIRED_DAYS = 28;
/** A weekday needs this many samples before its mean is a usable denominator. */
const MIN_WEEKDAY_SAMPLES = 2;
/** Shrinkage constant: with n samples, keep n/(n+K) of the observed effect. */
const SHRINK_K = 6;
const MULTIPLIER_MIN = 0.75;
const MULTIPLIER_MAX = 1.3;

const METRICS: ForecastMetric[] = ["revenue", "orders", "avg_check"];

export function neutralWeatherMultipliers(): WeatherMultipliers {
  const neutral = { dry: 1, light_rain: 1, heavy_rain: 1 };
  return {
    revenue: { ...neutral },
    orders: { ...neutral },
    avg_check: { ...neutral },
  };
}

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

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function clampMultiplier(value: number): number {
  return Math.min(MULTIPLIER_MAX, Math.max(MULTIPLIER_MIN, value));
}

/**
 * Empirical weather multipliers: each trading day's value is expressed as a ratio to its
 * weekday mean (so rainy Tuesdays compare against Tuesdays), ratios are grouped by weather
 * bucket, normalised against the dry bucket, then shrunk toward 1 by sample count.
 */
export function fitWeatherMultipliers(args: {
  history: DailySalesAggregate[];
  bucketsByDate: Record<string, WeatherBucket>;
}): WeatherMultipliers {
  const result = neutralWeatherMultipliers();

  // Trading days with paired weather; zero-order days are treated as closed, not signal.
  const paired = args.history.filter(
    (day) => day.ordersCount > 0 && args.bucketsByDate[day.date] !== undefined,
  );
  if (paired.length < MIN_PAIRED_DAYS) {
    return result;
  }

  for (const metric of METRICS) {
    const byWeekday = new Map<number, number[]>();
    for (const day of paired) {
      const dow = dayOfWeekUtc(day.date);
      const list = byWeekday.get(dow) ?? [];
      list.push(metricValue(day, metric));
      byWeekday.set(dow, list);
    }

    const weekdayMeans = new Map<number, number>();
    for (const [dow, values] of byWeekday) {
      if (values.length >= MIN_WEEKDAY_SAMPLES) {
        weekdayMeans.set(dow, mean(values));
      }
    }

    const ratiosByBucket = new Map<WeatherBucket, number[]>();
    for (const day of paired) {
      const weekdayMean = weekdayMeans.get(dayOfWeekUtc(day.date));
      if (!weekdayMean || weekdayMean <= 0) {
        continue;
      }
      const bucket = args.bucketsByDate[day.date];
      if (!bucket) {
        continue;
      }
      const list = ratiosByBucket.get(bucket) ?? [];
      list.push(metricValue(day, metric) / weekdayMean);
      ratiosByBucket.set(bucket, list);
    }

    const dryRatios = ratiosByBucket.get("dry") ?? [];
    const dryMean = dryRatios.length > 0 ? mean(dryRatios) : 1;
    if (dryMean <= 0) {
      continue;
    }

    for (const bucket of WEATHER_BUCKETS) {
      if (bucket === "dry") {
        continue;
      }
      const ratios = ratiosByBucket.get(bucket) ?? [];
      if (ratios.length === 0) {
        continue;
      }
      const raw = mean(ratios) / dryMean;
      const shrunk = 1 + (raw - 1) * (ratios.length / (ratios.length + SHRINK_K));
      result[metric][bucket] = clampMultiplier(shrunk);
    }
  }

  return result;
}

export function weatherMultiplierForDate(
  weather: ForecastWeatherContext | undefined,
  date: string,
  metric: ForecastMetric,
): { multiplier: number; bucket: WeatherBucket | null } {
  if (!weather) {
    return { multiplier: 1, bucket: null };
  }
  const bucket = weather.bucketsByDate[date];
  if (!bucket) {
    return { multiplier: 1, bucket: null };
  }
  return { multiplier: weather.multipliers[metric][bucket] ?? 1, bucket };
}
