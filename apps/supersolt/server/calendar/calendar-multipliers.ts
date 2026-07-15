import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";
import type { ForecastMetric } from "@/server/forecast/types";
import {
  isSchoolHoliday,
  publicHolidayName,
  type CalendarRegion,
} from "@/server/calendar/au-calendar";

/** Per-metric public-holiday multipliers, keyed by holiday name. Absent name => neutral (1x). */
export type CalendarMultipliers = Record<
  ForecastMetric,
  Record<string, number>
>;

export type ForecastCalendarContext = {
  region: CalendarRegion;
  multipliers: CalendarMultipliers;
};

/**
 * A named holiday must have recurred at least this many times in history before its multiplier is
 * trusted. With one year of data each holiday is seen once, so every multiplier stays neutral; the
 * effect only switches on once we have observed the *same* holiday before (year two onward).
 */
const MIN_SAME_HOLIDAY_SAMPLES = 2;
/** Shrinkage constant: with n samples, keep n/(n+K) of the observed effect. */
const SHRINK_K = 4;
/** Ignore effects smaller than this: below it a holiday multiplier is noise, so leave it at 1x. */
const EFFECT_DEADBAND = 0.04;
const MULTIPLIER_MIN = 0.5;
const MULTIPLIER_MAX = 1.5;

const METRICS: ForecastMetric[] = ["revenue", "orders", "avg_check"];

export function neutralCalendarMultipliers(): CalendarMultipliers {
  return { revenue: {}, orders: {}, avg_check: {} };
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
  return values.length
    ? values.reduce((acc, v) => acc + v, 0) / values.length
    : 0;
}

/**
 * Empirical public-holiday multipliers: each trading day is expressed as a ratio to its weekday
 * mean (so a holiday is measured against normal days of the same weekday), ratios are grouped by
 * holiday name, normalised against the non-holiday ratio, shrunk toward 1 by sample count, and
 * dropped entirely below {@link MIN_SAME_HOLIDAY_SAMPLES} or within the {@link EFFECT_DEADBAND}.
 */
export function fitCalendarMultipliers(args: {
  history: DailySalesAggregate[];
  region: CalendarRegion;
}): CalendarMultipliers {
  const result = neutralCalendarMultipliers();
  const trading = args.history.filter((d) => metricValue(d, "orders") > 0);
  if (trading.length < 28) {
    return result;
  }

  for (const metric of METRICS) {
    const byWeekday = new Map<number, number[]>();
    for (const day of trading) {
      const dow = dayOfWeekUtc(day.date);
      const list = byWeekday.get(dow) ?? [];
      list.push(metricValue(day, metric));
      byWeekday.set(dow, list);
    }
    const weekdayMeans = new Map<number, number>();
    for (const [dow, values] of byWeekday) {
      if (values.length >= 2) {
        weekdayMeans.set(dow, mean(values));
      }
    }

    const offRatios: number[] = [];
    const onRatiosByName = new Map<string, number[]>();
    for (const day of trading) {
      const weekdayMean = weekdayMeans.get(dayOfWeekUtc(day.date));
      if (!weekdayMean || weekdayMean <= 0) {
        continue;
      }
      const ratio = metricValue(day, metric) / weekdayMean;
      const name = publicHolidayName(args.region, day.date);
      if (name) {
        const list = onRatiosByName.get(name) ?? [];
        list.push(ratio);
        onRatiosByName.set(name, list);
      } else {
        offRatios.push(ratio);
      }
    }

    const offMean = offRatios.length > 0 ? mean(offRatios) : 1;
    if (offMean <= 0) {
      continue;
    }

    for (const [name, ratios] of onRatiosByName) {
      if (ratios.length < MIN_SAME_HOLIDAY_SAMPLES) {
        continue;
      }
      const raw = mean(ratios) / offMean;
      const shrunk = 1 + (raw - 1) * (ratios.length / (ratios.length + SHRINK_K));
      if (Math.abs(shrunk - 1) < EFFECT_DEADBAND) {
        continue;
      }
      result[metric][name] = Math.min(
        MULTIPLIER_MAX,
        Math.max(MULTIPLIER_MIN, shrunk),
      );
    }
  }

  return result;
}

/**
 * Calendar signal for a forecast date: the public-holiday multiplier for the metric (1x when the
 * day is not a holiday or the holiday has no trusted effect yet) plus the holiday name and
 * school-holiday flag for display and downstream reasoning.
 */
export function calendarSignalForDate(
  calendar: ForecastCalendarContext | undefined,
  isoDate: string,
  metric: ForecastMetric,
): { multiplier: number; holidayName: string | null; schoolHoliday: boolean } {
  if (!calendar) {
    return { multiplier: 1, holidayName: null, schoolHoliday: false };
  }
  const holidayName = publicHolidayName(calendar.region, isoDate);
  const schoolHoliday = isSchoolHoliday(calendar.region, isoDate);
  const multiplier = holidayName
    ? calendar.multipliers[metric][holidayName] ?? 1
    : 1;
  return { multiplier, holidayName, schoolHoliday };
}
