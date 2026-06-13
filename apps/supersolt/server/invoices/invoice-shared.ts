import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";

import type { InvoiceRow, InvoicesListPayload } from "@/entities/invoices/model/types";
import { InvoicesServiceError } from "@/server/invoices/invoices.errors";
import { invoicesRepo, type VenueInvoiceDbRow } from "@/server/invoices/invoices.repo";

export function mapRowToDto(row: VenueInvoiceDbRow): InvoiceRow {
  return {
    id: row.id,
    xeroInvoiceId: row.xeroInvoiceId,
    invoiceNumber: row.invoiceNumber,
    supplierName: row.supplierName,
    supplierId: row.supplierId,
    xeroContactId: row.xeroContactId,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    documentType: row.documentType as InvoiceRow["documentType"],
    totalCents: row.totalCents,
    amountDueCents: row.amountDueCents,
    subtotalCents: row.subtotalCents,
    gstCents: row.gstCents,
    currencyCode: row.currencyCode,
    xeroStatus: row.xeroStatus,
    reviewStatus: row.reviewStatus as InvoiceRow["reviewStatus"],
    source: row.source as InvoiceRow["source"],
    reference: row.reference,
    parseConfidence: row.parseConfidence as InvoiceRow["parseConfidence"],
    matchMethod: row.matchMethod as InvoiceRow["matchMethod"],
    purchaseOrderId: row.purchaseOrderId,
    disputeReason: row.disputeReason as InvoiceRow["disputeReason"],
    notes: row.notes,
    syncedAt: row.syncedAt,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
  };
}

export function resolveInvoiceVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new InvoicesServiceError(404, message),
    forbidden: (auth) => new InvoicesServiceError(auth.status, auth.message),
  });
}

export async function buildInvoiceListMeta(
  ctx: RequestAuthContext,
  venueId: string,
  venueSlug: string,
): Promise<InvoicesListPayload["meta"]> {
  const [connection, counts, inbox] = await Promise.all([
    ctx.appDb.rls((tx) => invoicesRepo.getConnectionSummaryRls(tx, venueId)),
    ctx.appDb.rls((tx) => invoicesRepo.countByReviewStatus(tx, venueId)),
    ctx.appDb.rls((tx) => invoicesRepo.getVenueInbox(tx, venueId)),
  ]);

  return {
    xeroConnected: Boolean(connection?.xeroTenantId),
    tenantName: connection?.xeroTenantName ?? null,
    lastSyncAt: connection?.lastInvoiceSyncAt ?? null,
    syncError: connection?.lastInvoiceSyncError ?? null,
    pendingReviewCount: counts.pending_review ?? 0,
    disputedCount: counts.disputed ?? 0,
    duplicateCount: counts.duplicate ?? 0,
    inboxAddress: inbox?.address ?? `${venueSlug}@inbox.supersolt.com`,
  };
}
