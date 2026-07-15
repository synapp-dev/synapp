/**
 * Open-Meteo client (no API key). Three endpoints:
 * - geocoding: resolve venue suburb/state to coordinates when venue lat/lng is unset
 * - archive: historical daily actuals (lags realtime by ~5 days)
 * - forecast: 16 days forward plus up to 92 recent past days (covers the archive lag)
 */

export type DailyWeatherObservation = {
  /** ISO calendar date in the requested timezone. */
  date: string;
  rainMm: number;
  tempMaxC: number | null;
  tempMinC: number | null;
  /** WMO weather interpretation code (0 clear .. 99 thunderstorm w/ hail). */
  weatherCode: number | null;
};

export type GeocodedLocation = {
  latitude: number;
  longitude: number;
  name: string;
};

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const DAILY_VARIABLES =
  "precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code";

type OpenMeteoDailyResponse = {
  daily?: {
    time?: string[];
    precipitation_sum?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    weather_code?: Array<number | null>;
  };
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (${response.status}): ${url}`);
  }
  return (await response.json()) as T;
}

function mapDailyResponse(payload: OpenMeteoDailyResponse): DailyWeatherObservation[] {
  const daily = payload.daily;
  const dates = daily?.time ?? [];
  const rain = daily?.precipitation_sum ?? [];
  const tMax = daily?.temperature_2m_max ?? [];
  const tMin = daily?.temperature_2m_min ?? [];
  const codes = daily?.weather_code ?? [];

  const rows: DailyWeatherObservation[] = [];
  for (let i = 0; i < dates.length; i += 1) {
    const date = dates[i];
    if (!date) {
      continue;
    }
    const rainMm = rain[i];
    // Trailing days can come back null before the provider has data; skip them.
    if (rainMm === null || rainMm === undefined) {
      continue;
    }
    rows.push({
      date,
      rainMm,
      tempMaxC: tMax[i] ?? null,
      tempMinC: tMin[i] ?? null,
      weatherCode: codes[i] ?? null,
    });
  }
  return rows;
}

/**
 * The geocoder matches on place name only (extra tokens like "VIC Australia" return
 * nothing), so region narrowing uses `countryCode` plus an admin1 filter on the results.
 */
export async function geocodeLocation(args: {
  name: string;
  countryCode?: string;
  admin1?: string;
}): Promise<GeocodedLocation | null> {
  const country = args.countryCode
    ? `&countryCode=${encodeURIComponent(args.countryCode)}`
    : "";
  const url =
    `${GEOCODING_URL}?name=${encodeURIComponent(args.name)}` +
    `&count=10&language=en&format=json${country}`;
  const payload = await fetchJson<{
    results?: Array<{
      latitude: number;
      longitude: number;
      name: string;
      admin1?: string;
    }>;
  }>(url);
  const results = payload.results ?? [];
  if (results.length === 0) {
    return null;
  }

  const admin1 = args.admin1?.toLowerCase();
  const hit =
    (admin1 &&
      results.find((r) => r.admin1?.toLowerCase() === admin1)) ||
    results[0];
  if (!hit) {
    return null;
  }
  return { latitude: hit.latitude, longitude: hit.longitude, name: hit.name };
}

export async function fetchArchiveDailyWeather(args: {
  latitude: number;
  longitude: number;
  timezone: string;
  fromDate: string;
  toDate: string;
}): Promise<DailyWeatherObservation[]> {
  const url =
    `${ARCHIVE_URL}?latitude=${args.latitude}&longitude=${args.longitude}` +
    `&start_date=${args.fromDate}&end_date=${args.toDate}` +
    `&daily=${DAILY_VARIABLES}&timezone=${encodeURIComponent(args.timezone)}`;
  return mapDailyResponse(await fetchJson<OpenMeteoDailyResponse>(url));
}

export async function fetchForecastDailyWeather(args: {
  latitude: number;
  longitude: number;
  timezone: string;
  pastDays?: number;
  forecastDays?: number;
}): Promise<DailyWeatherObservation[]> {
  const pastDays = Math.min(Math.max(args.pastDays ?? 7, 0), 92);
  const forecastDays = Math.min(Math.max(args.forecastDays ?? 16, 1), 16);
  const url =
    `${FORECAST_URL}?latitude=${args.latitude}&longitude=${args.longitude}` +
    `&past_days=${pastDays}&forecast_days=${forecastDays}` +
    `&daily=${DAILY_VARIABLES}&timezone=${encodeURIComponent(args.timezone)}`;
  return mapDailyResponse(await fetchJson<OpenMeteoDailyResponse>(url));
}
