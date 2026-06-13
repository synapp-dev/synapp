import type { RequestAuthContext } from "@/server/auth/context";
import { purchaseOrders } from "@/server/db/schema";
import { applyCostPropagation } from "@/server/invoices/invoice-cost-propagation.service";
import { InvoicesServiceError } from "@/server/invoices/invoices.errors";
import { getVenueInvoiceDetail } from "@/server/invoices/invoice-listing.service";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";
import { purchaseOrdersRepo } from "@/server/purchase-orders/purchase-orders.repo";
import { eq } from "drizzle-orm";

import type {
  BulkApproveResult,
  ConfirmInvoiceInput,
  DisputeReason,
  InvoiceDetailPayload,
} from "@/entities/invoices/model/types";

async function closePoIfReady(
  ctx: RequestAuthContext,
  poId: string,
  venueId: string,
): Promise<void> {
  const po = await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.getPurchaseOrder(tx, { venueId, poId }),
  );
  if (!po || po.status !== "delivered") return;

  await ctx.appDb.rls(async (tx) => {
    await tx
      .update(purchaseOrders)
      .set({ status: "closed", closedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .where(eq(purchaseOrders.id, poId));
  });
}

export async function confirmInvoice(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    input?: ConfirmInvoiceInput;
  },
): Promise<InvoiceDetailPayload> {
  const context = await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);

  const invoice = await ctx.appDb.rls((tx) =>
    invoicesRepo.getInvoiceById(tx, context.venueId, args.invoiceId),
  );
  if (!invoice) throw new InvoicesServiceError(404, "Invoice not found");

  if (!["pending_review", "pending_approval"].includes(invoice.reviewStatus)) {
    throw new InvoicesServiceError(400, "Invoice cannot be confirmed in its current status");
  }

  const threshold = await ctx.appDb.rls((tx) =>
    invoicesRepo.getInvoiceApprovalThreshold(tx, context.organisationId),
  );

  const now = new Date().toISOString();

  if (invoice.reviewStatus === "pending_review" && Math.abs(invoice.totalCents) >= threshold) {
    await ctx.appDb.rls((tx) =>
      invoicesRepo.updateInvoice(tx, invoice.id, { reviewStatus: "pending_approval" }),
    );
    await ctx.appDb.rls((tx) =>
      invoicesRepo.insertAudit(tx, {
        invoiceId: invoice.id,
        eventType: "pending_approval",
        afterValue: { thresholdCents: threshold },
        changedByUserId: ctx.userId,
      }),
    );
    return getVenueInvoiceDetail(ctx, args);
  }

  const propagate = args.input?.propagatePriceChanges ?? true;
  const lineIdSet = args.input?.linePropagation
    ? new Set(
        Object.entries(args.input.linePropagation)
          .filter(([, value]) => value)
          .map(([lineId]) => lineId),
      )
    : undefined;

  await applyCostPropagation(ctx.appDb, {
    invoiceId: invoice.id,
    organisationId: context.organisationId,
    venueId: context.venueId,
    userId: ctx.userId,
    propagate,
    lineIdsToPropagate: lineIdSet,
  });

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, invoice.id, {
      reviewStatus: "confirmed",
      confirmedAt: now,
      confirmedByUserId: ctx.userId,
    }),
  );

  if (invoice.purchaseOrderId) {
    await ctx.appDb.admin
      .update(purchaseOrders)
      .set({ linkedInvoiceId: invoice.id, updatedAt: now })
      .where(eq(purchaseOrders.id, invoice.purchaseOrderId));
    await closePoIfReady(ctx, invoice.purchaseOrderId, context.venueId);
  }

  await ctx.appDb.rls((tx) =>
    invoicesRepo.insertAudit(tx, {
      invoiceId: invoice.id,
      eventType: "confirmed",
      afterValue: { propagate },
      changedByUserId: ctx.userId,
    }),
  );

  return getVenueInvoiceDetail(ctx, args);
}

export async function disputeInvoice(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    reason: DisputeReason;
    notes?: string;
  },
): Promise<InvoiceDetailPayload> {
  const context = await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);
  const invoice = await ctx.appDb.rls((tx) =>
    invoicesRepo.getInvoiceById(tx, context.venueId, args.invoiceId),
  );
  if (!invoice) throw new InvoicesServiceError(404, "Invoice not found");

  const now = new Date().toISOString();
  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, invoice.id, {
      reviewStatus: "disputed",
      disputeReason: args.reason,
      disputeNotes: args.notes ?? null,
      disputedAt: now,
    }),
  );

  await ctx.appDb.rls((tx) =>
    invoicesRepo.insertAudit(tx, {
      invoiceId: invoice.id,
      eventType: "disputed",
      afterValue: { reason: args.reason, notes: args.notes },
      changedByUserId: ctx.userId,
    }),
  );

  return getVenueInvoiceDetail(ctx, args);
}

export async function markInvoiceDuplicate(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string; invoiceId: string },
): Promise<InvoiceDetailPayload> {
  await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);
  const now = new Date().toISOString();

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, args.invoiceId, {
      reviewStatus: "duplicate",
      archivedAt: now,
    }),
  );

  await ctx.appDb.rls((tx) =>
    invoicesRepo.insertAudit(tx, {
      invoiceId: args.invoiceId,
      eventType: "marked_duplicate",
      changedByUserId: ctx.userId,
    }),
  );

  return getVenueInvoiceDetail(ctx, args);
}

export async function bulkApproveInvoices(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string; invoiceIds: string[] },
): Promise<BulkApproveResult> {
  const approved: string[] = [];
  const failed: BulkApproveResult["failed"] = [];

  for (const invoiceId of args.invoiceIds) {
    try {
      await confirmInvoice(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        invoiceId,
        input: { propagatePriceChanges: true },
      });
      approved.push(invoiceId);
    } catch (error) {
      failed.push({
        invoiceId,
        reason: error instanceof Error ? error.message : "Confirm failed",
      });
    }
  }

  return { approved, failed };
}

export async function updateInvoiceLineMapping(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    lineId: string;
    supplierProductId?: string | null;
    ingredientId?: string | null;
  },
): Promise<InvoiceDetailPayload> {
  await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateLineItem(tx, args.lineId, {
      supplierProductId: args.supplierProductId,
      ingredientId: args.ingredientId,
      isUnmapped: !args.supplierProductId,
      mappingMethod: args.supplierProductId ? "manual" : null,
    }),
  );

  return getVenueInvoiceDetail(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    invoiceId: args.invoiceId,
  });
}
