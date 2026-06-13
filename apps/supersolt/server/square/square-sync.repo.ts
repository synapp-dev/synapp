import { and, eq, gte, inArray, lte } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { venueSquareOrderLines, venueSquarePayments } from "@/server/db/schema";

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
          set: {
            squareOrderId: venueSquarePayments.squareOrderId,
            orderDatetime: venueSquarePayments.orderDatetime,
            orderNumber: venueSquarePayments.orderNumber,
            channel: venueSquarePayments.channel,
            grossAmountCents: venueSquarePayments.grossAmountCents,
            taxAmountCents: venueSquarePayments.taxAmountCents,
            netAmountCents: venueSquarePayments.netAmountCents,
            discountAmountCents: venueSquarePayments.discountAmountCents,
            isVoid: venueSquarePayments.isVoid,
            isRefund: venueSquarePayments.isRefund,
            refundReason: venueSquarePayments.refundReason,
            paymentMethod: venueSquarePayments.paymentMethod,
            squareStatus: venueSquarePayments.squareStatus,
            squareSourceType: venueSquarePayments.squareSourceType,
            squareLocationId: venueSquarePayments.squareLocationId,
            receiptUrl: venueSquarePayments.receiptUrl,
            receiptNumber: venueSquarePayments.receiptNumber,
            squareCreatedAt: venueSquarePayments.squareCreatedAt,
            squareUpdatedAt: venueSquarePayments.squareUpdatedAt,
            observedAt: venueSquarePayments.observedAt,
            updatedAt: venueSquarePayments.updatedAt,
          },
        });
    }
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
