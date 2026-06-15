import type { RequestAuthContext } from "@/server/auth/context";
import { getAttachmentParseState, resolveParseableAttachment } from "@/server/invoices/invoice-attachment-parse.service";
import { buildCostChangePreview } from "@/server/invoices/invoice-cost-propagation.service";
import { InvoicesServiceError } from "@/server/invoices/invoices.errors";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import {
  buildInvoiceListMeta,
  mapRowToDto,
  resolveInvoiceVenueScope,
} from "@/server/invoices/invoice-shared";
import { purchaseOrdersRepo } from "@/server/purchase-orders/purchase-orders.repo";

import type { InvoiceDetailPayload, InvoicesListPayload } from "@/entities/invoices/model/types";

export async function listVenueInvoices(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    view?: "pending_review" | "all";
    fromDate?: string;
    toDate?: string;
    status?: string;
    supplierId?: string;
  },
): Promise<InvoicesListPayload> {
  const context = await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);

  const reviewStatus =
    args.view === "pending_review"
      ? ["pending_review", "pending_approval"]
      : args.status && args.status !== "all"
        ? args.status
        : undefined;

  const rows = await ctx.appDb.rls((tx) =>
    invoicesRepo.listInvoices(tx, {
      venueId: context.venueId,
      supplierId: args.supplierId,
      fromDate: args.fromDate,
      toDate: args.toDate,
      reviewStatus,
    }),
  );

  const meta = await buildInvoiceListMeta(ctx, context.venueId, args.venueSlug);

  return {
    invoices: rows.map(mapRowToDto),
    meta,
  };
}

export async function getVenueInvoiceDetail(
  ctx: RequestAuthContext,
  args: { organisationSlug: string; venueSlug: string; invoiceId: string },
): Promise<InvoiceDetailPayload> {
  const context = await resolveInvoiceVenueScope(ctx, args.organisationSlug, args.venueSlug);

  const invoice = await ctx.appDb.rls((tx) =>
    invoicesRepo.getInvoiceById(tx, context.venueId, args.invoiceId),
  );
  if (!invoice) {
    throw new InvoicesServiceError(404, "Invoice not found");
  }

  const [lineItems, attachments, auditLog, costChangePreview, poRow] = await ctx.appDb.rls(
    async (tx) => {
      const lines = await invoicesRepo.listLineItems(tx, invoice.id);
      const atts = await invoicesRepo.listAttachments(tx, invoice.id);
      const audit = await invoicesRepo.listAudit(tx, invoice.id);
      const preview =
        invoice.reviewStatus === "pending_review" ||
        invoice.reviewStatus === "pending_approval"
          ? await buildCostChangePreview(ctx.appDb, invoice.id)
          : null;

      let po: { poNumber: string } | null = null;
      if (invoice.purchaseOrderId) {
        const poFull = await purchaseOrdersRepo.getPurchaseOrder(tx, {
          venueId: context.venueId,
          poId: invoice.purchaseOrderId,
        });
        po = poFull ? { poNumber: poFull.po_number } : null;
      }

      return [lines, atts, audit, preview, po] as const;
    },
  );

  const xeroUrl = invoice.xeroInvoiceId
    ? `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${encodeURIComponent(invoice.xeroInvoiceId)}`
    : null;

  let xeroAttachments: InvoiceDetailPayload["xeroAttachments"] = [];
  let attachmentsSource: InvoiceDetailPayload["attachmentsSource"] =
    attachments.length > 0 ? "local" : "none";
  let attachmentsError: string | null = null;

  if (!attachments.length && invoice.xeroInvoiceId) {
    const { listVenueXeroInvoiceAttachments } = await import("@/server/xero/xero-invoices.service");
    const xeroPayload = await listVenueXeroInvoiceAttachments(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      invoiceId: args.invoiceId,
    });
    xeroAttachments = xeroPayload.attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      contentLength: a.contentLength,
      storagePath: "",
      source: "xero",
    }));
    attachmentsSource =
      xeroPayload.attachments.length > 0
        ? "xero"
        : xeroPayload.attachmentsSource === "unavailable"
          ? "none"
          : "none";
    attachmentsError = xeroPayload.attachmentsError;
  }

  const parseable = resolveParseableAttachment({
    invoice,
    localAttachments: attachments,
    xeroAttachments,
  });
  const attachmentParse = getAttachmentParseState({ invoice, parseable });

  return {
    invoice: mapRowToDto(invoice),
    lineItems: lineItems.map((l) => ({
      id: l.id,
      parsedDescription: l.parsedDescription,
      supplierProductId: l.supplierProductId,
      ingredientId: l.ingredientId,
      quantity: l.quantity != null ? Number(l.quantity) : null,
      unit: l.unit,
      unitPriceCents: l.unitPriceCents,
      lineTotalCents: l.lineTotalCents,
      isUnmapped: l.isUnmapped,
      mappingMethod: l.mappingMethod as "auto" | "manual" | null,
      sortOrder: l.sortOrder,
    })),
    attachments: attachments.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      contentLength: a.contentLength,
      storagePath: a.storagePath,
      source: a.source,
    })),
    xeroAttachments,
    attachmentsSource,
    attachmentsError,
    attachmentParse,
    auditLog: auditLog.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      beforeValue: e.beforeValue,
      afterValue: e.afterValue,
      changedByUserId: e.changedByUserId,
      changedAt: e.changedAt,
    })),
    xeroUrl,
    poNumber: poRow?.poNumber ?? null,
    costChangePreview,
  };
}
