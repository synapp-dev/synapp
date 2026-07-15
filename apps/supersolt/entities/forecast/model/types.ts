import type {
  DailySalesRow,
  ForecastRow,
  VenueForecastStateDto,
} from "@/server/forecast/types";
import type { VenueWeatherDayDto } from "@/server/weather/weather.service";

export type { DailySalesRow, ForecastInputs, ForecastMetric, ForecastRow, VenueForecastStateDto } from "@/server/forecast/types";
export type { VenueWeatherDayDto } from "@/server/weather/weather.service";

export type DailySalesApiPayload = {
  rows: DailySalesRow[];
  state: VenueForecastStateDto | null;
  /** Present (possibly empty) when WEATHER_FORECAST_ENABLED; absent from older payloads. */
  weather?: VenueWeatherDayDto[];
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
