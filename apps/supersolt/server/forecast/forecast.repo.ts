import { and, asc, eq, gte, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  dailySales,
  forecasts,
  venueCalendarEvents,
  venueForecastState,
  venues,
} from "@/server/db/schema";

export type DailySalesRow = typeof dailySales.$inferSelect;
export type DailySalesInsert = typeof dailySales.$inferInsert;
export type ForecastRow = typeof forecasts.$inferSelect;
export type ForecastInsert = typeof forecasts.$inferInsert;
export type VenueForecastStateRow = typeof venueForecastState.$inferSelect;
export type VenueForecastStateInsert = typeof venueForecastState.$inferInsert;
export type VenueCalendarEventRow = typeof venueCalendarEvents.$inferSelect;
export type VenueCalendarEventInsert = typeof venueCalendarEvents.$inferInsert;

export const forecastRepo = {
  /** All calendar events for a venue (admin read, used by the forecast engine). */
  async listCalendarEventsForVenue(
    appDb: AppDb,
    venueId: string,
  ): Promise<VenueCalendarEventRow[]> {
    return appDb.admin
      .select()
      .from(venueCalendarEvents)
      .where(eq(venueCalendarEvents.venueId, venueId))
      .orderBy(asc(venueCalendarEvents.startDate));
  },

  /** Calendar events for a venue under the caller's RLS (user-facing list). */
  async listCalendarEvents(
    tx: RlsTx,
    venueId: string,
  ): Promise<VenueCalendarEventRow[]> {
    return tx
      .select()
      .from(venueCalendarEvents)
      .where(eq(venueCalendarEvents.venueId, venueId))
      .orderBy(asc(venueCalendarEvents.startDate));
  },

  async insertCalendarEvent(
    tx: RlsTx,
    row: VenueCalendarEventInsert,
  ): Promise<VenueCalendarEventRow> {
    const [inserted] = await tx
      .insert(venueCalendarEvents)
      .values(row)
      .returning();
    if (!inserted) {
      throw new Error("Failed to insert calendar event");
    }
    return inserted;
  },

  async updateCalendarEvent(
    tx: RlsTx,
    args: {
      id: string;
      venueId: string;
      patch: Partial<
        Pick<
          VenueCalendarEventInsert,
          "kind" | "startDate" | "endDate" | "title" | "note" | "expectedMultiplier"
        >
      >;
    },
  ): Promise<VenueCalendarEventRow | null> {
    const [updated] = await tx
      .update(venueCalendarEvents)
      .set({ ...args.patch, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(venueCalendarEvents.id, args.id),
          eq(venueCalendarEvents.venueId, args.venueId),
        ),
      )
      .returning();
    return updated ?? null;
  },

  async deleteCalendarEvent(
    tx: RlsTx,
    args: { id: string; venueId: string },
  ): Promise<boolean> {
    const deleted = await tx
      .delete(venueCalendarEvents)
      .where(
        and(
          eq(venueCalendarEvents.id, args.id),
          eq(venueCalendarEvents.venueId, args.venueId),
        ),
      )
      .returning({ id: venueCalendarEvents.id });
    return deleted.length > 0;
  },

  async getVenueRegionInfo(
    appDb: AppDb,
    venueId: string,
  ): Promise<{ state: string | null; country: string | null } | null> {
    const rows = await appDb.admin
      .select({ state: venues.state, country: venues.country })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertDailySales(
    appDb: AppDb,
    rows: DailySalesInsert[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await appDb.admin
      .insert(dailySales)
      .values(rows)
      .onConflictDoUpdate({
        target: [dailySales.venueId, dailySales.date],
        // `excluded.*` takes the incoming row's values; referencing the
        // table's own columns here is a self-assignment no-op on conflict,
        // which froze each day's facts at their first computed snapshot.
        set: {
          revenueCents: sql`excluded.revenue_cents`,
          ordersCount: sql`excluded.orders_count`,
          avgCheckCents: sql`excluded.avg_check_cents`,
          refundsCount: sql`excluded.refunds_count`,
          refundsValueCents: sql`excluded.refunds_value_cents`,
          voidsCount: sql`excluded.voids_count`,
          dineInRevenueCents: sql`excluded.dine_in_revenue_cents`,
          pickUpRevenueCents: sql`excluded.pick_up_revenue_cents`,
          deliveryRevenueCents: sql`excluded.delivery_revenue_cents`,
          source: sql`excluded.source`,
          computedAt: sql`excluded.computed_at`,
        },
      });
  },

  async listDailySalesHistory(
    appDb: AppDb,
    venueId: string,
    throughDate?: string,
  ): Promise<DailySalesRow[]> {
    const query = appDb.admin
      .select()
      .from(dailySales)
      .where(
        throughDate
          ? and(
              eq(dailySales.venueId, venueId),
              lte(dailySales.date, throughDate),
            )
          : eq(dailySales.venueId, venueId),
      )
      .orderBy(asc(dailySales.date));

    return query;
  },

  async upsertForecasts(
    appDb: AppDb,
    rows: ForecastInsert[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    await appDb.admin
      .insert(forecasts)
      .values(rows)
      .onConflictDoUpdate({
        target: [forecasts.venueId, forecasts.date, forecasts.metric],
        // `excluded.*` — see upsertDailySales; self-assignment froze forecasts.
        set: {
          forecastValue: sql`excluded.forecast_value`,
          confidence: sql`excluded.confidence`,
          confidenceLowerBound: sql`excluded.confidence_lower_bound`,
          confidenceUpperBound: sql`excluded.confidence_upper_bound`,
          inputs: sql`excluded.inputs`,
          computedAt: sql`excluded.computed_at`,
        },
      });
  },

  async upsertVenueForecastState(
    appDb: AppDb,
    row: VenueForecastStateInsert,
  ): Promise<void> {
    await appDb.admin
      .insert(venueForecastState)
      .values(row)
      .onConflictDoUpdate({
        target: venueForecastState.venueId,
        set: {
          availableHistoryDays: row.availableHistoryDays,
          forecastReady: row.forecastReady,
          backfillStatus: row.backfillStatus,
          backfillProgress: row.backfillProgress,
          dataStartsFrom: row.dataStartsFrom,
          lastDailySalesSyncAt: row.lastDailySalesSyncAt,
          lastPaymentsSyncAt: row.lastPaymentsSyncAt,
          lastComputedAt: row.lastComputedAt,
          updatedAt: row.updatedAt,
        },
      });
  },

  async getVenueForecastState(
    tx: RlsTx,
    venueId: string,
  ): Promise<VenueForecastStateRow | null> {
    const rows = await tx
      .select()
      .from(venueForecastState)
      .where(eq(venueForecastState.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getVenueForecastStateAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<VenueForecastStateRow | null> {
    const rows = await appDb.admin
      .select()
      .from(venueForecastState)
      .where(eq(venueForecastState.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async listDailySalesInRange(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<DailySalesRow[]> {
    return tx
      .select()
      .from(dailySales)
      .where(
        and(
          eq(dailySales.venueId, args.venueId),
          gte(dailySales.date, args.fromDate),
          lte(dailySales.date, args.toDate),
        ),
      )
      .orderBy(asc(dailySales.date));
  },

  async listForecastsInRange(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<ForecastRow[]> {
    return tx
      .select()
      .from(forecasts)
      .where(
        and(
          eq(forecasts.venueId, args.venueId),
          gte(forecasts.date, args.fromDate),
          lte(forecasts.date, args.toDate),
        ),
      )
      .orderBy(asc(forecasts.date));
  },

  async listDailySalesHistoryForUser(
    tx: RlsTx,
    venueId: string,
    throughDate: string,
  ): Promise<DailySalesRow[]> {
    return tx
      .select()
      .from(dailySales)
      .where(
        and(
          eq(dailySales.venueId, venueId),
          lte(dailySales.date, throughDate),
        ),
      )
      .orderBy(asc(dailySales.date));
  },
};
