import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { purchaseOrderLines, purchaseOrders } from "@/server/db/schema";
import {
  purchaseOrdersRepo,
  type PoLineRow,
  type PoRow,
  type PoStatus,
} from "./purchase-orders.repo";
import {
  sendCancellationEmail,
  sendPurchaseOrderEmail,
} from "./po-email.service";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderDetailDto,
  PurchaseOrderSummaryDto,
  ReceivePurchaseOrderInput,
  UpsertPoLineInput,
} from "./purchase-orders.types";

export class PurchaseOrdersServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function computeGst(subtotalCents: number, gstTreatment: string): {
  gstCents: number;
  totalCents: number;
} {
  if (gstTreatment === "inclusive") {
    const gstCents = Math.round(subtotalCents - subtotalCents / 1.1);
    return { gstCents, totalCents: subtotalCents };
  }
  const gstCents = Math.round(subtotalCents * 0.1);
  return { gstCents, totalCents: subtotalCents + gstCents };
}

function lineSubtotal(qty: number, unitCents: number): number {
  return Math.round(qty * unitCents);
}

/**
 * PO lines are point-in-time documents written in the supplier's own
 * catalog language: SKU code and pack description are snapshotted from
 * the supplier product at write time (server-side, never trusted from
 * the client) so later catalog edits don't rewrite sent orders.
 */
async function buildLineInserts(
  tx: Parameters<typeof purchaseOrdersRepo.listSupplierProductSnapshots>[0],
  poId: string,
  lines: UpsertPoLineInput[],
): Promise<Array<typeof purchaseOrderLines.$inferInsert>> {
  const productIds = [
    ...new Set(
      lines
        .map((line) => line.supplierProductId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const snapshots = await purchaseOrdersRepo.listSupplierProductSnapshots(
    tx,
    productIds,
  );
  const snapshotById = new Map(snapshots.map((s) => [s.id, s]));

  return lines.map((line, index) => {
    const snap = line.supplierProductId
      ? snapshotById.get(line.supplierProductId)
      : undefined;
    return {
      poId,
      supplierProductId: line.supplierProductId ?? null,
      ingredientId: line.ingredientId ?? null,
      productName: line.productName,
      quantityOrdered: String(line.quantityOrdered),
      unitPriceCents: line.unitPriceCents,
      subtotalCents: lineSubtotal(line.quantityOrdered, line.unitPriceCents),
      notes: line.notes ?? null,
      sortOrder: index,
      skuCode: snap?.skuCode ?? null,
      packLabel: snap?.packLabel ?? null,
      unitsPerPack: snap?.unitsPerPack ?? null,
      packUnit: snap?.packUnit ?? null,
    };
  });
}

function isOverdue(po: PoRow): boolean {
  if (!po.expected_delivery_date) return false;
  if (po.status === "delivered" || po.status === "closed" || po.status === "cancelled") {
    return false;
  }
  if (po.status === "draft" || po.status === "pending_approval") return false;
  const expected = new Date(po.expected_delivery_date);
  const grace = new Date(expected);
  grace.setDate(grace.getDate() + 1);
  return new Date() > grace;
}

function allowedActions(po: PoRow): string[] {
  const actions: string[] = [];
  switch (po.status) {
    case "draft":
      actions.push("edit", "send", "cancel");
      break;
    case "pending_approval":
      actions.push("approve", "reject", "cancel", "edit");
      break;
    case "submitted":
      actions.push("confirm", "cancel");
      break;
    case "confirmed":
      actions.push("receive", "cancel");
      break;
    case "delivered":
      actions.push("close", "cancel");
      break;
    case "closed":
    case "cancelled":
      break;
    default:
      break;
  }
  return actions;
}

async function getContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new PurchaseOrdersServiceError(404, message),
    forbidden: (auth) => new PurchaseOrdersServiceError(auth.status, auth.message),
  });
}

async function getPurchasingSettings(
  ctx: RequestAuthContext,
  organisationId: string,
) {
  return ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.getPurchasingSettings(tx, organisationId),
  );
}

async function loadSupplierName(
  ctx: RequestAuthContext,
  supplierId: string,
): Promise<string> {
  return ctx.appDb.rls((tx) => purchaseOrdersRepo.loadSupplierName(tx, supplierId));
}

function toLineDto(row: PoLineRow) {
  return {
    id: row.id,
    supplierProductId: row.supplier_product_id,
    ingredientId: row.ingredient_id,
    productName: row.product_name,
    quantityOrdered: Number(row.quantity_ordered),
    quantityReceived: Number(row.quantity_received),
    unitPriceCents: row.unit_price_cents,
    subtotalCents: row.subtotal_cents,
    notes: row.notes,
    isOutstanding: row.is_outstanding,
    outstandingResolution: row.outstanding_resolution,
    skuCode: row.sku_code,
    packLabel: row.pack_label,
    unitsPerPack: row.units_per_pack,
    packUnit: row.pack_unit,
    expectedDeliveryDate: row.expected_delivery_date,
  };
}

async function buildDetail(
  ctx: RequestAuthContext,
  po: PoRow,
  supplierName: string,
): Promise<PurchaseOrderDetailDto> {
  const lines = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getLines(tx, po.id));
  const emails = await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.listEmailsForPo(tx, po.id),
  );
  const audit = await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.listAuditForPo(tx, po.id),
  );
  const receiving = await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.listReceivingForPo(tx, po.id),
  );

  return {
    id: po.id,
    poNumber: po.po_number,
    supplierId: po.supplier_id,
    supplierName,
    status: po.status,
    expectedDeliveryDate: po.expected_delivery_date,
    actualDeliveryDate: po.actual_delivery_date,
    subtotalCents: po.subtotal_cents,
    gstCents: po.gst_cents,
    totalCents: po.total_cents,
    gstTreatment: po.gst_treatment,
    notes: po.notes,
    partialDeliveryFlag: po.partial_delivery_flag,
    itemCount: lines.length,
    createdAt: po.created_at,
    updatedAt: po.updated_at,
    submittedAt: po.submitted_at,
    confirmedAt: po.confirmed_at,
    deliveredAt: po.delivered_at,
    closedAt: po.closed_at,
    cancelledAt: po.cancelled_at,
    cancellationReason: po.cancellation_reason,
    approvalStatus: po.approval_status,
    approvalComment: po.approval_comment,
    linkedInvoiceId: po.linked_invoice_id,
    isOverdue: isOverdue(po),
    lines: lines.map(toLineDto),
    allowedActions: allowedActions(po),
    emails: emails.map((e) => ({
      id: e.id,
      direction: e.direction,
      subject: e.subject,
      sentAt: e.sentAt,
      toAddress: e.toAddress,
    })),
    audit: audit.map((a) => ({
      id: a.id,
      eventType: a.eventType,
      changedAt: a.changedAt,
      beforeValue: a.beforeValue,
      afterValue: a.afterValue,
    })),
    receivingEvents: receiving.map((r) => ({
      id: r.id,
      receivedAt: r.receivedAt,
      notes: r.notes,
      quantitiesReceived: (r.quantitiesReceived as Record<string, number>) ?? {},
    })),
  };
}

async function recalculatePoTotals(
  ctx: RequestAuthContext,
  poId: string,
  gstTreatment: string,
): Promise<void> {
  await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.recalculatePoTotals(tx, poId, gstTreatment),
  );
}

export const purchaseOrdersService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      status?: PoStatus | "all";
      supplierId?: string;
      search?: string;
      fromDate?: string;
      toDate?: string;
    }
  ): Promise<{ orders: PurchaseOrderSummaryDto[]; statusCounts: Record<string, number> }> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const rows = await ctx.appDb.rls((tx) => purchaseOrdersRepo.listPurchaseOrders(tx, {
      venueId: context.venueId,
      status: args.status,
      supplierId: args.supplierId,
      search: args.search,
      fromDate: args.fromDate,
      toDate: args.toDate,
    }));

    const supplierIds = [...new Set(rows.map((r) => r.supplier_id))];
    const supplierNames = new Map<string, string>();
    if (supplierIds.length > 0) {
      const supplierRows = await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.listSupplierNamesByIds(tx, supplierIds),
      );
      for (const s of supplierRows) {
        supplierNames.set(s.id, s.name);
      }
    }

    const lineCounts =
      rows.length > 0
        ? await ctx.appDb.rls((tx) =>
            purchaseOrdersRepo.countLinesByPoIds(
              tx,
              rows.map((r) => r.id),
            ),
          )
        : new Map<string, number>();

    const statusCounts: Record<string, number> = {
      all: rows.length,
      draft: 0,
      pending_approval: 0,
      submitted: 0,
      confirmed: 0,
      delivered: 0,
      closed: 0,
      cancelled: 0,
      overdue: 0,
    };

    const orders: PurchaseOrderSummaryDto[] = rows.map((po) => {
      statusCounts[po.status] = (statusCounts[po.status] ?? 0) + 1;
      const overdue = isOverdue(po);
      if (overdue) statusCounts.overdue = (statusCounts.overdue ?? 0) + 1;

      return {
        id: po.id,
        poNumber: po.po_number,
        supplierId: po.supplier_id,
        supplierName: supplierNames.get(po.supplier_id) ?? "Supplier",
        status: po.status,
        expectedDeliveryDate: po.expected_delivery_date,
        subtotalCents: po.subtotal_cents,
        totalCents: po.total_cents,
        itemCount: lineCounts.get(po.id) ?? 0,
        createdAt: po.created_at,
        updatedAt: po.updated_at,
        isOverdue: overdue,
        approvalStatus: po.approval_status,
      };
    });

    return { orders, statusCounts };
  },

  async getDetail(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
    },
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po) {
      throw new PurchaseOrdersServiceError(404, "Purchase order not found");
    }
    const supplierName = await loadSupplierName(ctx, po.supplier_id);
    return buildDetail(ctx, po, supplierName);
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: CreatePurchaseOrderInput;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const settings = await getPurchasingSettings(ctx, context.organisationId);

    if (args.input.lines.length === 0) {
      throw new PurchaseOrdersServiceError(400, "At least one line item is required");
    }

    const year = new Date().getFullYear();
    const subtotal = args.input.lines.reduce(
      (sum, line) => sum + lineSubtotal(line.quantityOrdered, line.unitPriceCents),
      0,
    );
    const { gstCents, totalCents } = computeGst(subtotal, settings.gstTreatment);

    const po = await ctx.appDb.rls(async (tx) => {
      const poNumber = await purchaseOrdersRepo.allocatePoNumber(
        tx,
        context.venueId,
        year,
      );

      const created = await purchaseOrdersRepo.createPurchaseOrder(tx, {
        organisationId: context.organisationId,
        venueId: context.venueId,
        supplierId: args.input.supplierId,
        poNumber,
        status: "draft",
        expectedDeliveryDate: args.input.expectedDeliveryDate ?? null,
        subtotalCents: subtotal,
        gstCents,
        totalCents,
        gstTreatment: settings.gstTreatment,
        notes: args.input.notes ?? null,
        createdByUserId: ctx.userId,
      });

      await purchaseOrdersRepo.insertLines(
        tx,
        await buildLineInserts(tx, created.id, args.input.lines),
      );

      await purchaseOrdersRepo.insertAudit(tx, {
        poId: created.id,
        eventType: "created",
        afterValue: { status: "draft", poNumber },
        userId: ctx.userId,
      });

      return created;
    });

    return this.getDetail(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      poId: po.id,
    });
  },

  async updateDraft(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      expectedDeliveryDate?: string | null;
      notes?: string | null;
      lines?: UpsertPoLineInput[];
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po) {
      throw new PurchaseOrdersServiceError(404, "Purchase order not found");
    }
    if (po.status !== "draft" && po.status !== "pending_approval") {
      throw new PurchaseOrdersServiceError(400, "Only draft POs can be edited");
    }

    await ctx.appDb.rls(async (tx) => {
      const patch: Partial<typeof purchaseOrders.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      };
      if (args.expectedDeliveryDate !== undefined) {
        patch.expectedDeliveryDate = args.expectedDeliveryDate;
      }
      if (args.notes !== undefined) {
        patch.notes = args.notes;
      }

      if (Object.keys(patch).length > 1) {
        await purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, patch);
      }

      if (args.lines) {
        await purchaseOrdersRepo.deleteLinesForPo(tx, po.id);
        await purchaseOrdersRepo.insertLines(
          tx,
          await buildLineInserts(tx, po.id, args.lines),
        );
        await purchaseOrdersRepo.recalculatePoTotals(tx, po.id, po.gst_treatment);
      }

      await purchaseOrdersRepo.insertAudit(tx, {
        poId: po.id,
        eventType: "updated",
        userId: ctx.userId,
      });
    });

    return this.getDetail(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      poId: po.id,
    });
  },

  async send(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const settings = await getPurchasingSettings(ctx, context.organisationId);
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po) throw new PurchaseOrdersServiceError(404, "Purchase order not found");
    if (po.status !== "draft") {
      throw new PurchaseOrdersServiceError(400, "Only draft POs can be sent");
    }

    if (po.total_cents >= settings.poApprovalThresholdCents) {
      await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
          status: "pending_approval",
          approvalStatus: "pending",
          updatedAt: new Date().toISOString(),
        }),
      );
      await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.insertAudit(tx, {
          poId: po.id,
          eventType: "pending_approval",
          userId: ctx.userId,
        }),
      );
      return this.getDetail(ctx, { ...args });
    }

    return this.executeSend(ctx, { ...args, context, po });
  },

  async executeSend(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      context?: Awaited<ReturnType<typeof getContext>>;
      po?: PoRow;
    },
  ): Promise<PurchaseOrderDetailDto> {
    const context =
      args.context ??
      (await getContext(ctx, args.organisationSlug, args.venueSlug));
    const po =
      args.po ??
      (await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.getPurchaseOrder(tx, {
          venueId: context.venueId,
          poId: args.poId,
        }),
      ));
    if (!po) throw new PurchaseOrdersServiceError(404, "Purchase order not found");

    const supplier = await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.getSupplierOrderingInfo(tx, po.supplier_id),
    );

    const orderingEmail = supplier?.orderingEmail || supplier?.email;
    if (!orderingEmail?.trim()) {
      throw new PurchaseOrdersServiceError(
        400,
        "Supplier ordering email is required before sending"
      );
    }

    const lines = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getLines(tx, po.id));
    const venueSlug = args.venueSlug;
    const fromAddress = `${venueSlug}@inbox.supersolt.com`;

    await sendPurchaseOrderEmail(ctx, {
      po,
      lines,
      venueName: context.venueName,
      organisationName: context.organisationName,
      supplierName: supplier?.name ?? "Supplier",
      orderingEmail: orderingEmail.trim(),
      fromAddress,
    });

    const now = new Date().toISOString();
    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: "submitted",
        approvalStatus: "approved",
        submittedAt: now,
        updatedAt: now,
      }),
    );

    await ctx.appDb.rls((tx) => purchaseOrdersRepo.insertAudit(tx, {
      poId: po.id,
      eventType: "submitted",
      userId: ctx.userId,
    }));

    return this.getDetail(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      poId: po.id,
    });
  },

  async approve(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      comment?: string;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || po.status !== "pending_approval") {
      throw new PurchaseOrdersServiceError(400, "PO is not pending approval");
    }

    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        approvalStatus: "approved",
        approvedByUserId: ctx.userId,
        approvalComment: args.comment ?? null,
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.executeSend(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      poId: po.id,
      context,
      po: { ...po, status: "draft" },
    });
  },

  async reject(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      comment: string;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || po.status !== "pending_approval") {
      throw new PurchaseOrdersServiceError(400, "PO is not pending approval");
    }

    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: "draft",
        approvalStatus: "rejected",
        approvalComment: args.comment,
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.getDetail(ctx, { ...args });
  },

  async confirm(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      expectedDeliveryDate?: string | null;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || po.status !== "submitted") {
      throw new PurchaseOrdersServiceError(400, "PO must be submitted to confirm");
    }

    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: "confirmed",
        expectedDeliveryDate:
          args.expectedDeliveryDate ?? po.expected_delivery_date,
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.getDetail(ctx, { ...args });
  },

  async receive(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      input: ReceivePurchaseOrderInput;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || (po.status !== "confirmed" && po.status !== "delivered")) {
      throw new PurchaseOrdersServiceError(400, "PO must be confirmed to receive");
    }

    const lines = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getLines(tx, po.id));
    const lineMap = new Map(lines.map((l) => [l.id, l]));
    const quantitiesReceived: Record<string, number> = {};
    let partial = false;
    let stayConfirmed = false;

    for (const entry of args.input.lines) {
      const line = lineMap.get(entry.lineId);
      if (!line) continue;

      let received = entry.quantityReceived;
      const ordered = Number(line.quantity_ordered);

      if (received > ordered && entry.overReceiptResolution === "reject_extras") {
        received = ordered;
      }

      let subtotal = line.subtotal_cents;
      if (received > ordered && entry.overReceiptResolution === "accept_pay") {
        subtotal = Math.round(received * line.unit_price_cents);
      }

      const outstanding =
        received < ordered && entry.outstandingResolution === "expect_later";

      if (received < ordered) partial = true;
      if (outstanding) stayConfirmed = true;

      quantitiesReceived[entry.lineId] = received;

      await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.updateLine(tx, entry.lineId, {
          quantityReceived: String(
            Number(line.quantity_received) + received > ordered
              ? received
              : Number(line.quantity_received) + received,
          ),
          subtotalCents: subtotal,
          isOutstanding: outstanding,
          outstandingResolution: entry.outstandingResolution ?? null,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    const nextStatus = stayConfirmed ? "confirmed" : "delivered";
    await ctx.appDb.rls(async (tx) => {
      await purchaseOrdersRepo.insertReceivingEvent(tx, {
        poId: po.id,
        receivedByUserId: ctx.userId,
        quantitiesReceived,
        notes: args.input.notes ?? null,
      });

      await purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: nextStatus,
        partialDeliveryFlag: partial || po.partial_delivery_flag,
        deliveredAt:
          nextStatus === "delivered" ? new Date().toISOString() : po.delivered_at,
        actualDeliveryDate:
          nextStatus === "delivered"
            ? new Date().toISOString().slice(0, 10)
            : po.actual_delivery_date,
        updatedAt: new Date().toISOString(),
      });

      await purchaseOrdersRepo.recalculatePoTotals(tx, po.id, po.gst_treatment);
    });

    return this.getDetail(ctx, { ...args, poId: po.id });
  },

  async close(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || po.status !== "delivered") {
      throw new PurchaseOrdersServiceError(400, "Only delivered POs can be closed");
    }

    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: "closed",
        closedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.getDetail(ctx, { ...args });
  },

  async cancel(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poId: string;
      reason: string;
    }
  ): Promise<PurchaseOrderDetailDto> {
    const context = await getContext(ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const po = await ctx.appDb.rls((tx) => purchaseOrdersRepo.getPurchaseOrder(tx, {
      venueId: context.venueId,
      poId: args.poId,
    }));
    if (!po || po.status === "closed") {
      throw new PurchaseOrdersServiceError(400, "Cannot cancel this PO");
    }

    if (po.status === "submitted" || po.status === "confirmed") {
      const supplier = await ctx.appDb.rls((tx) =>
        purchaseOrdersRepo.getSupplierOrderingInfo(tx, po.supplier_id),
      );
      const orderingEmail = supplier?.orderingEmail || supplier?.email;
      if (orderingEmail?.trim()) {
        await sendCancellationEmail(ctx, {
          po,
          venueName: context.venueName,
          supplierName: supplier?.name ?? "Supplier",
          orderingEmail: orderingEmail.trim(),
          fromAddress: `${args.venueSlug}@inbox.supersolt.com`,
          reason: args.reason,
        });
      }
    }

    await ctx.appDb.rls((tx) =>
      purchaseOrdersRepo.updatePurchaseOrder(tx, po.id, {
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancellationReason: args.reason,
        updatedAt: new Date().toISOString(),
      }),
    );

    return this.getDetail(ctx, { ...args });
  },

  async bulkApprove(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      poIds: string[];
    }
  ): Promise<{ approved: string[]; failed: Array<{ poId: string; message: string }> }> {
    const approved: string[] = [];
    const failed: Array<{ poId: string; message: string }> = [];
    for (const poId of args.poIds) {
      try {
        await this.approve(ctx, { ...args, poId });
        approved.push(poId);
      } catch (e) {
        failed.push({
          poId,
          message: e instanceof Error ? e.message : "Failed",
        });
      }
    }
    return { approved, failed };
  },
};
