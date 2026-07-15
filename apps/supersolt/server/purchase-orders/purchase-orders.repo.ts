import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  organisationPurchasingSettings,
  organisations,
  purchaseOrderAuditLog,
  purchaseOrderEmails,
  purchaseOrderLines,
  purchaseOrderNumberSequences,
  purchaseOrderReceivingEvents,
  purchaseOrders,
  supplierProducts,
  suppliers,
  venueInvoices,
  venues,
} from "@/server/db/schema";

export type PoStatus =
  | "draft"
  | "pending_approval"
  | "submitted"
  | "confirmed"
  | "delivered"
  | "closed"
  | "cancelled";

export type PoRow = {
  id: string;
  organisation_id: string;
  venue_id: string;
  supplier_id: string;
  po_number: string;
  status: PoStatus;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  subtotal_cents: number;
  gst_cents: number;
  total_cents: number;
  gst_treatment: string;
  notes: string | null;
  partial_delivery_flag: boolean;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  delivered_at: string | null;
  closed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  approval_status: string | null;
  approved_by_user_id: string | null;
  approval_comment: string | null;
  rejected_at: string | null;
  linked_invoice_id: string | null;
};

export type PoLineRow = {
  id: string;
  po_id: string;
  supplier_product_id: string | null;
  ingredient_id: string | null;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price_cents: number;
  subtotal_cents: number;
  notes: string | null;
  is_outstanding: boolean;
  outstanding_resolution: string | null;
  expected_delivery_date: string | null;
  sort_order: number;
  sku_code: string | null;
  pack_label: string | null;
  units_per_pack: number | null;
  pack_unit: string | null;
};

type PurchaseOrderSelect = typeof purchaseOrders.$inferSelect;
type PurchaseOrderLineSelect = typeof purchaseOrderLines.$inferSelect;

function toPoRow(row: PurchaseOrderSelect): PoRow {
  return {
    id: row.id,
    organisation_id: row.organisationId,
    venue_id: row.venueId,
    supplier_id: row.supplierId,
    po_number: row.poNumber,
    status: row.status as PoStatus,
    expected_delivery_date: row.expectedDeliveryDate,
    actual_delivery_date: row.actualDeliveryDate,
    subtotal_cents: row.subtotalCents,
    gst_cents: row.gstCents,
    total_cents: row.totalCents,
    gst_treatment: row.gstTreatment,
    notes: row.notes,
    partial_delivery_flag: row.partialDeliveryFlag,
    created_by_user_id: row.createdByUserId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    submitted_at: row.submittedAt,
    confirmed_at: row.confirmedAt,
    delivered_at: row.deliveredAt,
    closed_at: row.closedAt,
    cancelled_at: row.cancelledAt,
    cancellation_reason: row.cancellationReason,
    approval_status: row.approvalStatus,
    approved_by_user_id: row.approvedByUserId,
    approval_comment: row.approvalComment,
    rejected_at: row.rejectedAt,
    linked_invoice_id: row.linkedInvoiceId,
  };
}

function toPoLineRow(row: PurchaseOrderLineSelect): PoLineRow {
  return {
    id: row.id,
    po_id: row.poId,
    supplier_product_id: row.supplierProductId,
    ingredient_id: row.ingredientId,
    product_name: row.productName,
    quantity_ordered: Number(row.quantityOrdered),
    quantity_received: Number(row.quantityReceived),
    unit_price_cents: row.unitPriceCents,
    subtotal_cents: row.subtotalCents,
    notes: row.notes,
    is_outstanding: row.isOutstanding,
    outstanding_resolution: row.outstandingResolution,
    expected_delivery_date: row.expectedDeliveryDate,
    sort_order: row.sortOrder,
    sku_code: row.skuCode,
    pack_label: row.packLabel,
    units_per_pack: row.unitsPerPack !== null ? Number(row.unitsPerPack) : null,
    pack_unit: row.packUnit,
  };
}

export const purchaseOrdersRepo = {
  async allocatePoNumber(
    tx: RlsTx,
    venueId: string,
    year: number,
  ): Promise<string> {
    const existing = await tx
      .select({ lastNumber: purchaseOrderNumberSequences.lastNumber })
      .from(purchaseOrderNumberSequences)
      .where(
        and(
          eq(purchaseOrderNumberSequences.venueId, venueId),
          eq(purchaseOrderNumberSequences.year, year),
        ),
      )
      .limit(1);

    const next = (existing[0]?.lastNumber ?? 0) + 1;

    await tx
      .insert(purchaseOrderNumberSequences)
      .values({ venueId, year, lastNumber: next })
      .onConflictDoUpdate({
        target: [
          purchaseOrderNumberSequences.venueId,
          purchaseOrderNumberSequences.year,
        ],
        set: { lastNumber: next },
      });

    return `PO-${year}-${String(next).padStart(4, "0")}`;
  },

  async listPurchaseOrders(
    tx: RlsTx,
    args: {
      venueId: string;
      status?: PoStatus | "all";
      supplierId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    },
  ): Promise<PoRow[]> {
    const conditions: SQL[] = [eq(purchaseOrders.venueId, args.venueId)];

    if (args.status && args.status !== "all") {
      conditions.push(eq(purchaseOrders.status, args.status));
    }
    if (args.supplierId) {
      conditions.push(eq(purchaseOrders.supplierId, args.supplierId));
    }
    if (args.fromDate) {
      conditions.push(
        gte(purchaseOrders.createdAt, `${args.fromDate}T00:00:00.000Z`),
      );
    }
    if (args.toDate) {
      conditions.push(
        lte(purchaseOrders.createdAt, `${args.toDate}T23:59:59.999Z`),
      );
    }
    if (args.search?.trim()) {
      conditions.push(
        ilike(purchaseOrders.poNumber, `%${args.search.trim()}%`),
      );
    }

    const rows = await tx
      .select()
      .from(purchaseOrders)
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));

    return rows.map(toPoRow);
  },

  async getPurchaseOrder(
    tx: RlsTx,
    args: { venueId: string; poId: string },
  ): Promise<PoRow | null> {
    const rows = await tx
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.id, args.poId),
          eq(purchaseOrders.venueId, args.venueId),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? toPoRow(row) : null;
  },

  async getLines(tx: RlsTx, poId: string): Promise<PoLineRow[]> {
    const rows = await tx
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.poId, poId))
      .orderBy(purchaseOrderLines.sortOrder);

    return rows.map(toPoLineRow);
  },

  async insertAudit(
    tx: RlsTx,
    args: {
      poId: string;
      eventType: string;
      beforeValue?: unknown;
      afterValue?: unknown;
      userId: string | null;
    },
  ): Promise<void> {
    await tx.insert(purchaseOrderAuditLog).values({
      poId: args.poId,
      eventType: args.eventType,
      beforeValue: args.beforeValue ?? null,
      afterValue: args.afterValue ?? null,
      changedByUserId: args.userId,
    });
  },

  /** Supplier-catalog fields to snapshot onto PO lines at write time. */
  async listSupplierProductSnapshots(
    tx: RlsTx,
    ids: string[],
  ): Promise<
    Array<{
      id: string;
      skuCode: string | null;
      packLabel: string | null;
      unitsPerPack: string | null;
      packUnit: string | null;
    }>
  > {
    if (ids.length === 0) return [];
    return tx
      .select({
        id: supplierProducts.id,
        skuCode: supplierProducts.skuCode,
        packLabel: supplierProducts.packLabel,
        unitsPerPack: supplierProducts.unitsPerPack,
        packUnit: supplierProducts.packUnit,
      })
      .from(supplierProducts)
      .where(inArray(supplierProducts.id, ids));
  },

  async insertLines(
    tx: RlsTx,
    lines: Array<typeof purchaseOrderLines.$inferInsert>,
  ): Promise<void> {
    if (lines.length === 0) {
      return;
    }
    await tx.insert(purchaseOrderLines).values(lines);
  },

  async deleteLinesForPo(tx: RlsTx, poId: string): Promise<void> {
    await tx.delete(purchaseOrderLines).where(eq(purchaseOrderLines.poId, poId));
  },

  async updatePurchaseOrder(
    tx: RlsTx,
    poId: string,
    patch: Partial<typeof purchaseOrders.$inferInsert>,
  ): Promise<void> {
    await tx
      .update(purchaseOrders)
      .set(patch)
      .where(eq(purchaseOrders.id, poId));
  },

  async updateLine(
    tx: RlsTx,
    lineId: string,
    patch: Partial<typeof purchaseOrderLines.$inferInsert>,
  ): Promise<void> {
    await tx
      .update(purchaseOrderLines)
      .set(patch)
      .where(eq(purchaseOrderLines.id, lineId));
  },

  async recalculatePoTotals(
    tx: RlsTx,
    poId: string,
    gstTreatment: string,
  ): Promise<void> {
    const lines = await tx
      .select({
        subtotalCents: purchaseOrderLines.subtotalCents,
      })
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.poId, poId));

    const subtotalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0);
    let gstCents: number;
    let totalCents: number;
    if (gstTreatment === "inclusive") {
      gstCents = Math.round(subtotalCents - subtotalCents / 1.1);
      totalCents = subtotalCents;
    } else {
      gstCents = Math.round(subtotalCents * 0.1);
      totalCents = subtotalCents + gstCents;
    }

    await tx
      .update(purchaseOrders)
      .set({
        subtotalCents,
        gstCents,
        totalCents,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(purchaseOrders.id, poId));
  },

  async insertReceivingEvent(
    tx: RlsTx,
    row: typeof purchaseOrderReceivingEvents.$inferInsert,
  ): Promise<void> {
    await tx.insert(purchaseOrderReceivingEvents).values(row);
  },

  async getPurchasingSettings(
    tx: RlsTx,
    organisationId: string,
  ): Promise<{
    defaultBufferPercent: number;
    poApprovalThresholdCents: number;
    gstTreatment: string;
    poEmailTemplate: string | null;
  }> {
    const rows = await tx
      .select()
      .from(organisationPurchasingSettings)
      .where(eq(organisationPurchasingSettings.organisationId, organisationId))
      .limit(1);

    const data = rows[0];
    return {
      defaultBufferPercent: Number(data?.defaultBufferPercent ?? 15),
      poApprovalThresholdCents: Number(data?.poApprovalThresholdCents ?? 50000),
      gstTreatment: data?.gstTreatment ?? "exclusive",
      poEmailTemplate: data?.poEmailTemplate ?? null,
    };
  },

  async getOrgLogoUrl(tx: RlsTx, organisationId: string): Promise<string | null> {
    const rows = await tx
      .select({ logoUrl: organisations.logoUrl })
      .from(organisations)
      .where(eq(organisations.id, organisationId))
      .limit(1);
    return rows[0]?.logoUrl ?? null;
  },

  async getVenueContact(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({
        addressLine1: venues.addressLine1,
        addressLine2: venues.addressLine2,
        suburb: venues.suburb,
        state: venues.state,
        postcode: venues.postcode,
        phone: venues.phone,
      })
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const address = [
      row.addressLine1,
      row.addressLine2,
      [row.suburb, row.state, row.postcode].filter(Boolean).join(" "),
    ]
      .filter((part) => part && part.trim())
      .join(", ");
    return { address: address || null, phone: row.phone ?? null };
  },

  async loadSupplierName(tx: RlsTx, supplierId: string): Promise<string> {
    const rows = await tx
      .select({ name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    return rows[0]?.name ?? "Supplier";
  },

  async listEmailsForPo(tx: RlsTx, poId: string) {
    return tx
      .select({
        id: purchaseOrderEmails.id,
        direction: purchaseOrderEmails.direction,
        subject: purchaseOrderEmails.subject,
        sentAt: purchaseOrderEmails.sentAt,
        toAddress: purchaseOrderEmails.toAddress,
      })
      .from(purchaseOrderEmails)
      .where(eq(purchaseOrderEmails.poId, poId))
      .orderBy(desc(purchaseOrderEmails.sentAt));
  },

  async listAuditForPo(tx: RlsTx, poId: string) {
    return tx
      .select({
        id: purchaseOrderAuditLog.id,
        eventType: purchaseOrderAuditLog.eventType,
        changedAt: purchaseOrderAuditLog.changedAt,
        beforeValue: purchaseOrderAuditLog.beforeValue,
        afterValue: purchaseOrderAuditLog.afterValue,
      })
      .from(purchaseOrderAuditLog)
      .where(eq(purchaseOrderAuditLog.poId, poId))
      .orderBy(desc(purchaseOrderAuditLog.changedAt))
      .limit(50);
  },

  async listSupplierNamesByIds(tx: RlsTx, supplierIds: string[]) {
    if (supplierIds.length === 0) {
      return [];
    }
    return tx
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(inArray(suppliers.id, supplierIds));
  },

  async countLinesByPoIds(
    tx: RlsTx,
    poIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (poIds.length === 0) {
      return counts;
    }
    const rows = await tx
      .select({ poId: purchaseOrderLines.poId })
      .from(purchaseOrderLines)
      .where(inArray(purchaseOrderLines.poId, poIds));
    for (const row of rows) {
      counts.set(row.poId, (counts.get(row.poId) ?? 0) + 1);
    }
    return counts;
  },

  async createPurchaseOrder(
    tx: RlsTx,
    row: typeof purchaseOrders.$inferInsert,
  ): Promise<PoRow> {
    const inserted = await tx.insert(purchaseOrders).values(row).returning();
    const created = inserted[0];
    if (!created) {
      throw new Error("Failed to create purchase order");
    }
    return toPoRow(created);
  },

  async getSupplierOrderingInfo(tx: RlsTx, supplierId: string) {
    const rows = await tx
      .select({
        name: suppliers.name,
        orderingEmail: suppliers.orderingEmail,
        email: suppliers.email,
      })
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);
    return rows[0] ?? null;
  },

  async isInvoiceConfirmed(tx: RlsTx, invoiceId: string): Promise<boolean> {
    const rows = await tx
      .select({ reviewStatus: venueInvoices.reviewStatus })
      .from(venueInvoices)
      .where(eq(venueInvoices.id, invoiceId))
      .limit(1);
    return rows[0]?.reviewStatus === "confirmed";
  },

  async listReceivingForPo(tx: RlsTx, poId: string) {
    return tx
      .select({
        id: purchaseOrderReceivingEvents.id,
        receivedAt: purchaseOrderReceivingEvents.receivedAt,
        notes: purchaseOrderReceivingEvents.notes,
        quantitiesReceived: purchaseOrderReceivingEvents.quantitiesReceived,
      })
      .from(purchaseOrderReceivingEvents)
      .where(eq(purchaseOrderReceivingEvents.poId, poId))
      .orderBy(desc(purchaseOrderReceivingEvents.receivedAt));
  },
};
