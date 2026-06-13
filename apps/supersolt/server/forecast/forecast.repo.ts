import { and, asc, eq, gte, lte } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  dailySales,
  forecasts,
  venueForecastState,
} from "@/server/db/schema";

export type DailySalesRow = typeof dailySales.$inferSelect;
export type DailySalesInsert = typeof dailySales.$inferInsert;
export type ForecastRow = typeof forecasts.$inferSelect;
export type ForecastInsert = typeof forecasts.$inferInsert;
export type VenueForecastStateRow = typeof venueForecastState.$inferSelect;
export type VenueForecastStateInsert = typeof venueForecastState.$inferInsert;

export const forecastRepo = {
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
        set: {
          revenueCents: dailySales.revenueCents,
          ordersCount: dailySales.ordersCount,
          avgCheckCents: dailySales.avgCheckCents,
          refundsCount: dailySales.refundsCount,
          refundsValueCents: dailySales.refundsValueCents,
          voidsCount: dailySales.voidsCount,
          dineInRevenueCents: dailySales.dineInRevenueCents,
          pickUpRevenueCents: dailySales.pickUpRevenueCents,
          deliveryRevenueCents: dailySales.deliveryRevenueCents,
          source: dailySales.source,
          computedAt: dailySales.computedAt,
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
        set: {
          forecastValue: forecasts.forecastValue,
          confidence: forecasts.confidence,
          confidenceLowerBound: forecasts.confidenceLowerBound,
          confidenceUpperBound: forecasts.confidenceUpperBound,
          inputs: forecasts.inputs,
          computedAt: forecasts.computedAt,
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
