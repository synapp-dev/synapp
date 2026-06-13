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
  sameWeekdaySampleCount: number;
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
