import { addDaysCalendarIso } from "@/lib/date/calendar-iso";
import type { DailySalesAggregate } from "@/lib/sales/daily-sales-aggregate";
import { todayCalendarIsoInVenue } from "@/lib/roster/venue-time";
import type { AppDb } from "@/server/db/create-app-db";
import {
  fetchArchiveDailyWeather,
  fetchForecastDailyWeather,
  geocodeLocation,
  type DailyWeatherObservation,
} from "@/server/weather/open-meteo";
import {
  conditionBucketForRain,
  isWeatherBucket,
  type WeatherBucket,
} from "@/server/weather/weather-buckets";
import {
  fitWeatherMultipliers,
  type ForecastWeatherContext,
} from "@/server/weather/weather-multipliers";
import {
  weatherRepo,
  type VenueWeatherDailyInsert,
  type WeatherVenueRow,
} from "@/server/weather/weather.repo";

/** Archive endpoint lags realtime; days newer than this come from the forecast endpoint's past_days. */
const ARCHIVE_LAG_DAYS = 8;
const FORECAST_PAST_DAYS = 14;
const FORECAST_HORIZON_DAYS = 16;
/** Without sales history, still seed enough actuals to fit multipliers later. */
const DEFAULT_BACKFILL_DAYS = 90;

export type VenueCoordinates = { latitude: number; longitude: number };

export async function resolveVenueCoordinates(
  venue: Pick<
    WeatherVenueRow,
    "locationLat" | "locationLng" | "suburb" | "state" | "country"
  >,
): Promise<VenueCoordinates | null> {
  const lat = venue.locationLat === null ? NaN : Number(venue.locationLat);
  const lng = venue.locationLng === null ? NaN : Number(venue.locationLng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }

  if (!venue.suburb) {
    return null;
  }
  const geocoded = await geocodeLocation({
    name: venue.suburb,
    countryCode: countryCodeFor(venue.country),
    admin1: venue.state ? AU_STATE_NAMES[venue.state.toUpperCase()] ?? venue.state : undefined,
  });
  return geocoded
    ? { latitude: geocoded.latitude, longitude: geocoded.longitude }
    : null;
}

const AU_STATE_NAMES: Record<string, string> = {
  VIC: "Victoria",
  NSW: "New South Wales",
  QLD: "Queensland",
  SA: "South Australia",
  WA: "Western Australia",
  TAS: "Tasmania",
  NT: "Northern Territory",
  ACT: "Australian Capital Territory",
};

function countryCodeFor(country: string | null): string | undefined {
  const name = (country ?? "Australia").trim().toLowerCase();
  if (name === "australia" || name === "au") {
    return "AU";
  }
  // Unknown countries fall back to an unfiltered name search.
  return undefined;
}

function toWeatherInsert(
  venueId: string,
  observation: DailyWeatherObservation,
  todayIso: string,
): VenueWeatherDailyInsert {
  return {
    venueId,
    date: observation.date,
    rainMm: observation.rainMm.toFixed(2),
    tempMaxC: observation.tempMaxC === null ? null : observation.tempMaxC.toFixed(2),
    tempMinC: observation.tempMinC === null ? null : observation.tempMinC.toFixed(2),
    conditionBucket: conditionBucketForRain(observation.rainMm),
    isForecast: observation.date >= todayIso,
    source: "open-meteo",
    fetchedAt: new Date().toISOString(),
    weatherCode: observation.weatherCode,
  };
}

export async function syncWeatherForVenue(
  appDb: AppDb,
  args: {
    venue: WeatherVenueRow;
    coordinates: VenueCoordinates;
    backfillFromDate?: string | null;
    /** Re-fetch the full archive range even when history already exists (e.g. new columns). */
    forceBackfill?: boolean;
  },
): Promise<{ upsertedDays: number; backfilled: boolean }> {
  const { venue, coordinates } = args;
  const todayIso = todayCalendarIsoInVenue(venue.timezone);
  const archiveCutoff = addDaysCalendarIso(todayIso, -ARCHIVE_LAG_DAYS);

  const backfillTarget =
    args.backfillFromDate ??
    (await weatherRepo.getEarliestDailySalesDate(appDb, venue.venueId)) ??
    addDaysCalendarIso(todayIso, -DEFAULT_BACKFILL_DAYS);

  const earliestWeather = await weatherRepo.getEarliestWeatherDate(
    appDb,
    venue.venueId,
  );
  const needsBackfill =
    args.forceBackfill === true ||
    earliestWeather === null ||
    earliestWeather > backfillTarget;

  const observations: DailyWeatherObservation[] = [];

  if (needsBackfill && backfillTarget < archiveCutoff) {
    observations.push(
      ...(await fetchArchiveDailyWeather({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        timezone: venue.timezone,
        fromDate: backfillTarget,
        toDate: archiveCutoff,
      })),
    );
  }

  observations.push(
    ...(await fetchForecastDailyWeather({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      timezone: venue.timezone,
      pastDays: FORECAST_PAST_DAYS,
      forecastDays: FORECAST_HORIZON_DAYS,
    })),
  );

  // Forecast rows come last so recent overlapping days take the fresher value.
  const byDate = new Map(observations.map((o) => [o.date, o]));
  const rows = [...byDate.values()].map((o) =>
    toWeatherInsert(venue.venueId, o, todayIso),
  );

  await weatherRepo.upsertVenueWeatherDaily(appDb, rows);
  return { upsertedDays: rows.length, backfilled: needsBackfill };
}

export async function runDailyWeatherSync(
  appDb: AppDb,
  opts?: { forceBackfill?: boolean },
): Promise<{
  synced: number;
  skipped: number;
  errors: Array<{ venueId: string; message: string }>;
}> {
  const venues = await weatherRepo.listActiveVenuesForWeather(appDb);
  let synced = 0;
  let skipped = 0;
  const errors: Array<{ venueId: string; message: string }> = [];

  for (const venue of venues) {
    try {
      const coordinates = await resolveVenueCoordinates(venue);
      if (!coordinates) {
        skipped += 1;
        continue;
      }
      await syncWeatherForVenue(appDb, {
        venue,
        coordinates,
        forceBackfill: opts?.forceBackfill,
      });
      synced += 1;
    } catch (error) {
      errors.push({
        venueId: venue.venueId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { synced, skipped, errors };
}

export type VenueWeatherDayDto = {
  date: string;
  rainMm: number;
  tempMaxC: number | null;
  tempMinC: number | null;
  bucket: WeatherBucket;
  weatherCode: number | null;
  isForecast: boolean;
};

/** Per-day weather for a venue and date range, shaped for client payloads. */
export async function listVenueWeatherRange(
  appDb: AppDb,
  args: { venueId: string; fromDate: string; toDate: string },
): Promise<VenueWeatherDayDto[]> {
  const rows = await weatherRepo.listWeatherForVenue(appDb, args);
  return rows.map((row) => ({
    date: row.date,
    rainMm: Number(row.rainMm),
    tempMaxC: row.tempMaxC === null ? null : Number(row.tempMaxC),
    tempMinC: row.tempMinC === null ? null : Number(row.tempMinC),
    bucket: isWeatherBucket(row.conditionBucket)
      ? row.conditionBucket
      : conditionBucketForRain(Number(row.rainMm)),
    weatherCode: row.weatherCode ?? null,
    isForecast: row.isForecast,
  }));
}

/**
 * Weather context for the forecast engine: buckets for every stored day (actuals and
 * forward forecast) plus multipliers fitted on actual days only. Null when no weather
 * has been ingested for the venue yet.
 */
export async function getForecastWeatherContext(
  appDb: AppDb,
  args: { venueId: string; history: DailySalesAggregate[] },
): Promise<ForecastWeatherContext | null> {
  const rows = await weatherRepo.listWeatherForVenue(appDb, {
    venueId: args.venueId,
  });
  if (rows.length === 0) {
    return null;
  }

  const bucketsByDate: Record<string, WeatherBucket> = {};
  const actualBuckets: Record<string, WeatherBucket> = {};
  for (const row of rows) {
    const bucket = isWeatherBucket(row.conditionBucket)
      ? row.conditionBucket
      : conditionBucketForRain(Number(row.rainMm));
    bucketsByDate[row.date] = bucket;
    if (!row.isForecast) {
      actualBuckets[row.date] = bucket;
    }
  }

  const multipliers = fitWeatherMultipliers({
    history: args.history,
    bucketsByDate: actualBuckets,
  });

  return { bucketsByDate, multipliers };
}
