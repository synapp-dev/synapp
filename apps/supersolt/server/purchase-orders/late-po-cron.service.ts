import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import {
  purchaseOrderAuditLog,
  purchaseOrders,
  suppliers,
} from "@/server/db/schema";

/**
 * Spec: a PO that is submitted/confirmed and not delivered within
 * expected_delivery_date + supplier grace (default 1 day) is flagged late.
 * The flag is an audit event, which puts it on the PO's trail and feeds the
 * morning digest's overdue counts; idempotent per PO + expected date so a
 * re-confirmed delivery date re-alerts once.
 */
export const latePoCronService = {
  async run(appDb: AppDb): Promise<{ scanned: number; flagged: number }> {
    const db = appDb.admin;
    const today = new Date().toISOString().slice(0, 10);

    const candidates = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        venueId: purchaseOrders.venueId,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        graceDays: suppliers.lateDeliveryGraceDays,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
      .where(
        and(
          inArray(purchaseOrders.status, ["submitted", "confirmed"]),
          isNotNull(purchaseOrders.expectedDeliveryDate),
        ),
      );

    let flagged = 0;
    for (const po of candidates) {
      if (!po.expectedDeliveryDate) continue;
      const grace = new Date(`${po.expectedDeliveryDate}T00:00:00Z`);
      grace.setUTCDate(grace.getUTCDate() + (po.graceDays ?? 1));
      if (grace.toISOString().slice(0, 10) >= today) continue;

      const existing = await db
        .select({ id: purchaseOrderAuditLog.id })
        .from(purchaseOrderAuditLog)
        .where(
          and(
            eq(purchaseOrderAuditLog.poId, po.id),
            eq(purchaseOrderAuditLog.eventType, "late_alert"),
            sql`${purchaseOrderAuditLog.afterValue} ->> 'expectedDeliveryDate' = ${po.expectedDeliveryDate}`,
          ),
        )
        .limit(1);
      if (existing.length > 0) continue;

      await db.insert(purchaseOrderAuditLog).values({
        poId: po.id,
        eventType: "late_alert",
        beforeValue: null,
        afterValue: {
          expectedDeliveryDate: po.expectedDeliveryDate,
          supplierName: po.supplierName,
          flaggedOn: today,
        },
        changedByUserId: null,
      });
      console.info(
        `[cron/late-purchase-orders] ${po.poNumber} (${po.supplierName}) due ${po.expectedDeliveryDate} still not received`,
      );
      flagged += 1;
    }

    return { scanned: candidates.length, flagged };
  },
};
