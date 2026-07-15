import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { menuItems, venueSquareOrderLines, venueSquarePayments } from "@/server/db/schema";

export type VenueSquarePaymentInsert = typeof venueSquarePayments.$inferInsert;
export type VenueSquarePaymentRow = typeof venueSquarePayments.$inferSelect;
export type VenueSquareOrderLineRow = typeof venueSquareOrderLines.$inferSelect;

export const squareSyncRepo = {
  async upsertPayments(
    appDb: AppDb,
    rows: VenueSquarePaymentInsert[],
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }
    const chunkSize = 200;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await appDb.admin
        .insert(venueSquarePayments)
        .values(chunk)
        .onConflictDoUpdate({
          target: [venueSquarePayments.venueId, venueSquarePayments.squarePaymentId],
          // `excluded.*` takes the incoming row's values; referencing the
          // table's own columns here is a self-assignment no-op on conflict,
          // which silently froze refund/void status on re-sync.
          set: {
            squareOrderId: sql`excluded.square_order_id`,
            orderDatetime: sql`excluded.order_datetime`,
            orderNumber: sql`excluded.order_number`,
            channel: sql`excluded.channel`,
            grossAmountCents: sql`excluded.gross_amount_cents`,
            taxAmountCents: sql`excluded.tax_amount_cents`,
            netAmountCents: sql`excluded.net_amount_cents`,
            discountAmountCents: sql`excluded.discount_amount_cents`,
            isVoid: sql`excluded.is_void`,
            isRefund: sql`excluded.is_refund`,
            refundReason: sql`excluded.refund_reason`,
            paymentMethod: sql`excluded.payment_method`,
            squareStatus: sql`excluded.square_status`,
            squareSourceType: sql`excluded.square_source_type`,
            squareLocationId: sql`excluded.square_location_id`,
            receiptUrl: sql`excluded.receipt_url`,
            receiptNumber: sql`excluded.receipt_number`,
            squareCreatedAt: sql`excluded.square_created_at`,
            squareUpdatedAt: sql`excluded.square_updated_at`,
            observedAt: sql`excluded.observed_at`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
  },

  /**
   * A sale proves the item is in use: flip show_on_menu on for any item with a
   * mirrored sales line since the cutoff — including lines from earlier syncs,
   * so historical data reconciles too. Never flips items off — staleness is
   * only flagged.
   */
  async activateMenuItemsWithRecentSales(
    appDb: AppDb,
    args: { venueId: string; sinceIso: string },
  ): Promise<string[]> {
    const updated = await appDb.admin
      .update(menuItems)
      .set({ showOnMenu: true, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(menuItems.venueId, args.venueId),
          eq(menuItems.showOnMenu, false),
          isNull(menuItems.archivedAt),
          sql`exists (
            select 1 from ${venueSquareOrderLines}
            where ${venueSquareOrderLines.venueId} = ${args.venueId}
              and ${venueSquareOrderLines.menuItemId} = ${menuItems.id}
              and ${venueSquareOrderLines.observedAt} >= ${args.sinceIso}
          )`,
        ),
      )
      .returning({ id: menuItems.id });
    return updated.map((row) => row.id);
  },

  async listPaymentsInRange(
    tx: RlsTx,
    args: { venueId: string; startIso: string; endIso: string },
  ): Promise<VenueSquarePaymentRow[]> {
    return tx
      .select()
      .from(venueSquarePayments)
      .where(
        and(
          eq(venueSquarePayments.venueId, args.venueId),
          gte(venueSquarePayments.orderDatetime, args.startIso),
          lte(venueSquarePayments.orderDatetime, args.endIso),
        ),
      )
      .orderBy(venueSquarePayments.orderDatetime);
  },

  async listPaymentsInRangeAdmin(
    appDb: AppDb,
    args: { venueId: string; startIso: string; endIso: string },
  ): Promise<VenueSquarePaymentRow[]> {
    return appDb.admin
      .select()
      .from(venueSquarePayments)
      .where(
        and(
          eq(venueSquarePayments.venueId, args.venueId),
          gte(venueSquarePayments.orderDatetime, args.startIso),
          lte(venueSquarePayments.orderDatetime, args.endIso),
        ),
      )
      .orderBy(venueSquarePayments.orderDatetime);
  },

  async listOrderLinesForPayments(
    tx: RlsTx,
    args: { venueId: string; squarePaymentIds: string[] },
  ): Promise<VenueSquareOrderLineRow[]> {
    if (args.squarePaymentIds.length === 0) {
      return [];
    }
    return tx
      .select()
      .from(venueSquareOrderLines)
      .where(
        and(
          eq(venueSquareOrderLines.venueId, args.venueId),
          inArray(venueSquareOrderLines.squarePaymentId, args.squarePaymentIds),
        ),
      );
  },

  async listOrderLinesForPaymentsAdmin(
    appDb: AppDb,
    args: { venueId: string; squarePaymentIds: string[] },
  ): Promise<VenueSquareOrderLineRow[]> {
    if (args.squarePaymentIds.length === 0) {
      return [];
    }
    return appDb.admin
      .select()
      .from(venueSquareOrderLines)
      .where(
        and(
          eq(venueSquareOrderLines.venueId, args.venueId),
          inArray(venueSquareOrderLines.squarePaymentId, args.squarePaymentIds),
        ),
      );
  },
};
