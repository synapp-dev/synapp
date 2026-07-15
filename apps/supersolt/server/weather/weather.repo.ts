import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import { dailySales, venues, venueWeatherDaily } from "@/server/db/schema";

export type VenueWeatherDailyRow = typeof venueWeatherDaily.$inferSelect;
export type VenueWeatherDailyInsert = typeof venueWeatherDaily.$inferInsert;

export type WeatherVenueRow = {
  venueId: string;
  organisationId: string;
  timezone: string;
  suburb: string | null;
  state: string | null;
  country: string | null;
  locationLat: string | null;
  locationLng: string | null;
};

export const weatherRepo = {
  async upsertVenueWeatherDaily(
    appDb: AppDb,
    rows: VenueWeatherDailyInsert[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await appDb.admin
      .insert(venueWeatherDaily)
      .values(rows)
      .onConflictDoUpdate({
        target: [venueWeatherDaily.venueId, venueWeatherDaily.date],
        set: {
          rainMm: sql`excluded.rain_mm`,
          tempMaxC: sql`excluded.temp_max_c`,
          tempMinC: sql`excluded.temp_min_c`,
          conditionBucket: sql`excluded.condition_bucket`,
          isForecast: sql`excluded.is_forecast`,
          source: sql`excluded.source`,
          fetchedAt: sql`excluded.fetched_at`,
          weatherCode: sql`excluded.weather_code`,
        },
      });
  },

  async listWeatherForVenue(
    appDb: AppDb,
    args: { venueId: string; fromDate?: string; toDate?: string },
  ): Promise<VenueWeatherDailyRow[]> {
    const conditions = [eq(venueWeatherDaily.venueId, args.venueId)];
    if (args.fromDate) {
      conditions.push(gte(venueWeatherDaily.date, args.fromDate));
    }
    if (args.toDate) {
      conditions.push(lte(venueWeatherDaily.date, args.toDate));
    }
    return appDb.admin
      .select()
      .from(venueWeatherDaily)
      .where(and(...conditions))
      .orderBy(asc(venueWeatherDaily.date));
  },

  async getEarliestWeatherDate(
    appDb: AppDb,
    venueId: string,
  ): Promise<string | null> {
    const rows = await appDb.admin
      .select({ date: venueWeatherDaily.date })
      .from(venueWeatherDaily)
      .where(eq(venueWeatherDaily.venueId, venueId))
      .orderBy(asc(venueWeatherDaily.date))
      .limit(1);
    return rows[0]?.date ?? null;
  },

  async getEarliestDailySalesDate(
    appDb: AppDb,
    venueId: string,
  ): Promise<string | null> {
    const rows = await appDb.admin
      .select({ date: dailySales.date })
      .from(dailySales)
      .where(eq(dailySales.venueId, venueId))
      .orderBy(asc(dailySales.date))
      .limit(1);
    return rows[0]?.date ?? null;
  },

  async listActiveVenuesForWeather(appDb: AppDb): Promise<WeatherVenueRow[]> {
    return appDb.admin
      .select({
        venueId: venues.id,
        organisationId: venues.organisationId,
        timezone: venues.timezone,
        suburb: venues.suburb,
        state: venues.state,
        country: venues.country,
        locationLat: venues.locationLat,
        locationLng: venues.locationLng,
      })
      .from(venues)
      .where(and(eq(venues.isActive, true), isNull(venues.archivedAt)));
  },
};
