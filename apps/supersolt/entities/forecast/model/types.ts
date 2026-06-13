import type {
  DailySalesRow,
  ForecastRow,
  VenueForecastStateDto,
} from "@/server/forecast/types";

export type { DailySalesRow, ForecastMetric, ForecastRow, VenueForecastStateDto } from "@/server/forecast/types";

export type DailySalesApiPayload = {
  rows: DailySalesRow[];
  state: VenueForecastStateDto | null;
};

export type ForecastsApiPayload = {
  forecasts: ForecastRow[];
  state: VenueForecastStateDto | null;
};

export type ForecastSyncApiPayload = {
  orderCount: number;
  dayCount: number;
  forecastReady: boolean;
};

export type ForecastRecomputeApiPayload = {
  forecastCount: number;
  availableHistoryDays: number;
  forecastReady: boolean;
};
