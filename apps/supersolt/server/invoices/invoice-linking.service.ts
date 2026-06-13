import type { RequestAuthContext } from "@/server/auth/context";
import { purchaseOrders } from "@/server/db/schema";
import { isLikelyDuplicate } from "@/server/invoices/duplicate-detector";
import { pickBestPoMatch } from "@/server/invoices/invoice-po-matcher";
import { getVenueInvoiceDetail } from "@/server/invoices/invoice-listing.service";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { resolveInvoiceVenueScope } from "@/server/invoices/invoice-shared";
import { purchaseOrdersRepo } from "@/server/purchase-orders/purchase-orders.repo";
import { eq } from "drizzle-orm";

import type { InvoiceDetailPayload } from "@/entities/invoices/model/types";

export async function runPoMatchForInvoice(
  ctx: RequestAuthContext,
  invoiceId: string,
  venueId: string,
  organisationId: string,
): Promise<void> {
  void organisationId;
  const invoice = await ctx.appDb.rls((tx) => invoicesRepo.getInvoiceById(tx, venueId, invoiceId));
  if (!invoice || invoice.purchaseOrderId) return;

  const openPos = await ctx.appDb.rls((tx) =>
    purchaseOrdersRepo.listPurchaseOrders(tx, {
      venueId,
      status: "all",
      supplierId: invoice.supplierId ?? undefined,
    }),
  );

  const matchable = openPos.filter((po) => ["submitted", "confirmed", "delivered"].includes(po.status));

  const best = pickBestPoMatch(invoice, matchable);
  if (!best) return;

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, invoiceId, {
      purchaseOrderId: best.po.id,
      matchMethod: "auto",
    }),
  );

  await ctx.appDb.admin
    .update(purchaseOrders)
    .set({ linkedInvoiceId: invoiceId, updatedAt: new Date().toISOString() })
    .where(eq(purchaseOrders.id, best.po.id));
}

export async function checkAndMarkDuplicate(
  ctx: RequestAuthContext,
  invoiceId: string,
  venueId: string,
): Promise<boolean> {
  const invoice = await ctx.appDb.rls((tx) => invoicesRepo.getInvoiceById(tx, venueId, invoiceId));
  if (!invoice) return false;

  const existing = await invoicesRepo.findDuplicateCandidate(ctx.appDb, {
    venueId,
    invoiceNumber: invoice.invoiceNumber,
    supplierId: invoice.supplierId,
    supplierName: invoice.supplierName,
    totalCents: invoice.totalCents,
    excludeInvoiceId: invoice.id,
  });

  if (!existing || !isLikelyDuplicate(existing, invoice)) return false;

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, invoiceId, {
      reviewStatus: "duplicate",
      archivedAt: new Date().toISOString(),
    }),
  );
  return true;
}

export async function linkInvoiceToPo(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    purchaseOrderId: string | null;
    matchMethod: "manual" | "standalone";
  },
): Promise<InvoiceDetailPayload> {
  await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);

  await ctx.appDb.rls((tx) =>
    invoicesRepo.updateInvoice(tx, args.invoiceId, {
      purchaseOrderId: args.purchaseOrderId,
      matchMethod: args.matchMethod,
    }),
  );

  if (args.purchaseOrderId) {
    await ctx.appDb.admin
      .update(purchaseOrders)
      .set({ linkedInvoiceId: args.invoiceId, updatedAt: new Date().toISOString() })
      .where(eq(purchaseOrders.id, args.purchaseOrderId));
  }

  return getVenueInvoiceDetail(ctx, args);
}
