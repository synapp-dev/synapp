import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";

export type ForecastMetric = "revenue" | "orders" | "avg_check";

export type ForecastConfidence = "low" | "medium" | "high";

export type { DailySalesAggregate };

export type DailySalesRow = DailySalesAggregate & {
  venueId: string;
  source: string;
  computedAt: string;
};

export type ForecastInputs = {
  baseline: number;
  trendMultiplier: number;
  monthlySeasonalityMultiplier: number;
  holidayMultiplier: number;
  schoolHolidayMultiplier: number;
  weatherMultiplier: number;
  /** Weather bucket the multiplier was derived from; absent when weather is off or unknown. */
  weatherBucket?: string;
  sameWeekdaySampleCount: number;
  /** Fresh trend-tracking level (deseasonalised × weekday factor) blended into the baseline; absent cold-start. */
  trendLevelBaseline?: number;
  /** Weight the trend level received in the blend (0 = pure same-weekday). */
  trendBlendWeight?: number;
  /** Name of the public holiday on this date; absent when not a holiday. */
  publicHolidayName?: string;
  /** True when this date falls in a school-term break. */
  schoolHoliday?: boolean;
  /** Operator-event multiplier applied to this metric (promotions/events); absent when 1. */
  eventMultiplier?: number;
  /** True when the venue is marked closed on this date (forecast forced to zero). */
  closed?: boolean;
  /** Operator events overlapping this date, for display. */
  events?: Array<{ kind: string; title: string }>;
};

export type ForecastRow = {
  date: string;
  metric: ForecastMetric;
  forecastValue: number;
  confidence: ForecastConfidence;
  confidenceLowerBound: number | null;
  confidenceUpperBound: number | null;
  inputs: ForecastInputs;
};

export type VenueForecastStateDto = {
  availableHistoryDays: number;
  forecastReady: boolean;
  backfillStatus: string;
  backfillProgress: Record<string, unknown> | null;
  dataStartsFrom: string | null;
  lastDailySalesSyncAt: string | null;
  lastPaymentsSyncAt: string | null;
  lastComputedAt: string | null;
};
