import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  dailySales,
  forecasts,
  ingredientConsumptionDaily,
  purchaseOrders,
  venueDigestCache,
  venueInvoices,
  venueSquareConnections,
} from "@/server/db/schema";

export type VenueDigestKind = "dashboard" | "inventory";

export const dashboardDigestRepo = {
  /** Access is already venue-scope checked by the service, so reads go via admin. */
  async getCachedDigest(
    appDb: AppDb,
    args: { venueId: string; kind: VenueDigestKind },
  ): Promise<{ digest: string; groundingHash: string; generatedAt: string } | null> {
    const rows = await appDb.admin
      .select({
        digest: venueDigestCache.digest,
        groundingHash: venueDigestCache.groundingHash,
        generatedAt: venueDigestCache.generatedAt,
      })
      .from(venueDigestCache)
      .where(
        and(
          eq(venueDigestCache.venueId, args.venueId),
          eq(venueDigestCache.kind, args.kind),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertCachedDigest(
    appDb: AppDb,
    args: {
      venueId: string;
      kind: VenueDigestKind;
      digest: string;
      groundingHash: string;
    },
  ): Promise<void> {
    await appDb.admin
      .insert(venueDigestCache)
      .values({
        venueId: args.venueId,
        kind: args.kind,
        digest: args.digest,
        groundingHash: args.groundingHash,
        generatedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [venueDigestCache.venueId, venueDigestCache.kind],
        set: {
          digest: sql`excluded.digest`,
          groundingHash: sql`excluded.grounding_hash`,
          generatedAt: sql`excluded.generated_at`,
        },
      });
  },

  async listDailySales(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<
    Array<{ date: string; revenueCents: number; ordersCount: number }>
  > {
    return tx
      .select({
        date: dailySales.date,
        revenueCents: dailySales.revenueCents,
        ordersCount: dailySales.ordersCount,
      })
      .from(dailySales)
      .where(
        and(
          eq(dailySales.venueId, args.venueId),
          gte(dailySales.date, args.fromDate),
          lte(dailySales.date, args.toDate),
        ),
      )
      .orderBy(desc(dailySales.date));
  },

  async listRevenueForecasts(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<Array<{ date: string; forecastValue: number }>> {
    const rows = await tx
      .select({ date: forecasts.date, forecastValue: forecasts.forecastValue })
      .from(forecasts)
      .where(
        and(
          eq(forecasts.venueId, args.venueId),
          eq(forecasts.metric, "revenue"),
          gte(forecasts.date, args.fromDate),
          lte(forecasts.date, args.toDate),
        ),
      );
    return rows.map((r) => ({ date: r.date, forecastValue: Number(r.forecastValue) }));
  },

  /** Theoretical COGS from finalized consumption facts per day. */
  async consumptionCostByDay(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<Array<{ date: string; costCents: number }>> {
    const rows = await tx
      .select({
        date: ingredientConsumptionDaily.date,
        costCents: sql<string>`coalesce(sum(${ingredientConsumptionDaily.costCents}), 0)`,
      })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          eq(ingredientConsumptionDaily.isFinal, true),
          gte(ingredientConsumptionDaily.date, args.fromDate),
          lte(ingredientConsumptionDaily.date, args.toDate),
        ),
      )
      .groupBy(ingredientConsumptionDaily.date);
    return rows.map((r) => ({ date: r.date, costCents: Number(r.costCents) }));
  },

  async pendingInvoiceStats(
    tx: RlsTx,
    venueId: string,
  ): Promise<{ count: number; oldestDate: string | null }> {
    const rows = await tx
      .select({
        count: sql<string>`count(*)`,
        oldest: sql<string | null>`min(${venueInvoices.invoiceDate})`,
      })
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.venueId, venueId),
          inArray(venueInvoices.reviewStatus, ["pending_review", "pending_approval"]),
          // Catalog-seeding imports are not operational work; mirror the
          // invoices module, which keeps them out of the review queue.
          eq(venueInvoices.setupImport, false),
        ),
      );
    return {
      count: Number(rows[0]?.count ?? 0),
      oldestDate: rows[0]?.oldest ?? null,
    };
  },

  async openPoStats(
    tx: RlsTx,
    args: { venueId: string; today: string },
  ): Promise<{ open: number; overdue: number; pendingApproval: number }> {
    const rows = await tx
      .select({
        status: purchaseOrders.status,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.venueId, args.venueId),
          inArray(purchaseOrders.status, [
            "pending_approval",
            "submitted",
            "confirmed",
          ]),
        ),
      );

    let open = 0;
    let overdue = 0;
    let pendingApproval = 0;
    for (const row of rows) {
      if (row.status === "pending_approval") {
        pendingApproval += 1;
        continue;
      }
      open += 1;
      if (row.expectedDeliveryDate && row.expectedDeliveryDate < args.today) {
        overdue += 1;
      }
    }
    return { open, overdue, pendingApproval };
  },

  async squareConnectionHealth(
    tx: RlsTx,
    venueId: string,
  ): Promise<{ connected: boolean; tokenExpiresAt: string | null }> {
    const rows = await tx
      .select({ tokenExpiresAt: venueSquareConnections.tokenExpiresAt })
      .from(venueSquareConnections)
      .where(eq(venueSquareConnections.venueId, venueId))
      .limit(1);
    const row = rows[0];
    return {
      connected: Boolean(row),
      tokenExpiresAt: row?.tokenExpiresAt ?? null,
    };
  },
};
