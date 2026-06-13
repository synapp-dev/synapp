import type { RequestAuthContext } from "@/server/auth/context";
import { VenueAccessError } from "@/server/access/venue-access";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { venueInvoices } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import { xeroInvoicesRepo } from "@/server/xero/xero-invoices.repo";
import { shouldPreserveReviewStatus } from "@/server/invoices/invoices.constants";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import {
  checkAndMarkDuplicate,
  runPoMatchForInvoice,
} from "@/server/invoices/invoices.service";
import { resolveSupplierIdForXeroContact } from "@/server/xero/xero-suppliers.service";
import { aggregateInvoiceLinesToRawCatalogForVenue } from "@/server/supplier-raw-items/aggregate-invoice-lines";
import { getXeroAccountingInvoice, type XeroApiLineItem } from "@/server/xero/get-accounting-invoice";
import { getXeroAccountingInvoiceAttachment } from "@/server/xero/get-accounting-invoice-attachment";
import { listXeroAccpayInvoices } from "@/server/xero/list-accounting-invoices";
import {
  listXeroAccountingInvoiceAttachments,
  type XeroApiAttachment,
} from "@/server/xero/list-accounting-invoice-attachments";
import { mapXeroApiInvoice } from "@/server/xero/xero-invoice-map";
import { getVenueXeroConnectionSummary } from "@/server/xero/venue-xero-connection";
import type {
  VenueXeroInvoiceAttachment,
  VenueXeroInvoiceDetailPayload,
  VenueXeroInvoiceLineItem,
  VenueXeroInvoiceRow,
  VenueXeroInvoiceAttachmentsPayload,
  XeroInvoicesListPayload,
  XeroInvoicesSyncPayload,
} from "@/entities/xero/model/invoice-types";

export { VenueAccessError } from "@/server/access/venue-access";

function mapDbRowToDto(row: import("@/server/invoices/invoices.repo").VenueInvoiceDbRow): VenueXeroInvoiceRow {
  return {
    id: row.id,
    xeroInvoiceId: row.xeroInvoiceId ?? "",
    invoiceNumber: row.invoiceNumber,
    supplierName: row.supplierName,
    xeroContactId: row.xeroContactId,
    invoiceDate: row.invoiceDate,
    dueDate: row.dueDate,
    documentType: row.documentType as VenueXeroInvoiceRow["documentType"],
    totalCents: row.totalCents,
    amountDueCents: row.amountDueCents,
    currencyCode: row.currencyCode,
    xeroStatus: row.xeroStatus,
    reviewStatus: row.reviewStatus as VenueXeroInvoiceRow["reviewStatus"],
    source: row.source as VenueXeroInvoiceRow["source"],
    reference: row.reference,
    xeroUpdatedAt: row.xeroUpdatedAt,
    syncedAt: row.syncedAt,
  };
}

function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new VenueAccessError(404, message),
    forbidden: (auth) => new VenueAccessError(auth.status, auth.message),
  });
}

function dollarsToCents(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

function mapXeroLineItem(row: XeroApiLineItem): VenueXeroInvoiceLineItem {
  return {
    description: row.Description?.trim() ?? null,
    quantity: row.Quantity ?? null,
    unitAmountCents: dollarsToCents(row.UnitAmount),
    lineAmountCents: dollarsToCents(row.LineAmount),
    accountCode: row.AccountCode?.trim() ?? null,
  };
}

function xeroBillViewUrl(xeroInvoiceId: string): string {
  return `https://go.xero.com/AccountsPayable/View.aspx?InvoiceID=${encodeURIComponent(xeroInvoiceId)}`;
}

function mapXeroAttachment(row: XeroApiAttachment): VenueXeroInvoiceAttachment | null {
  const fileName = row.FileName?.trim();
  if (!fileName) {
    return null;
  }

  return {
    id: row.AttachmentID?.trim() || fileName,
    fileName,
    mimeType: row.MimeType?.trim() ?? null,
    contentLength:
      typeof row.ContentLength === "number" && Number.isFinite(row.ContentLength)
        ? row.ContentLength
        : null,
  };
}

type ResolvedVenueInvoice = {
  context: { venueId: string; organisationId: string };
  invoice: VenueXeroInvoiceRow;
};

async function resolveVenueInvoice(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  },
): Promise<ResolvedVenueInvoice> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const data = await ctx.appDb.rls((tx) =>
    xeroInvoicesRepo.getInvoiceById(tx, context.venueId, args.invoiceId),
  );

  if (!data) {
    throw new VenueAccessError(404, "Invoice not found");
  }

  return {
    context,
    invoice: mapDbRowToDto(data),
  };
}

async function fetchVenueXeroInvoiceAttachments(
  ctx: RequestAuthContext,
  venueId: string,
  xeroInvoiceId: string,
): Promise<VenueXeroInvoiceAttachmentsPayload> {
  const connection = await loadVenueXeroConnectionForVenue(ctx.appDb, venueId);
  if (!connection) {
    return {
      attachments: [],
      attachmentsSource: "unavailable",
      attachmentsError: "Xero is not connected",
    };
  }

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    return {
      attachments: [],
      attachmentsSource: "unavailable",
      attachmentsError: token.message,
    };
  }

  const listed = await listXeroAccountingInvoiceAttachments({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    xeroInvoiceId,
  });

  if (!listed.ok) {
    return {
      attachments: [],
      attachmentsSource: "unavailable",
      attachmentsError: listed.message,
    };
  }

  const attachments = listed.attachments
    .map(mapXeroAttachment)
    .filter((row): row is VenueXeroInvoiceAttachment => row !== null);

  return {
    attachments,
    attachmentsSource: "xero",
    attachmentsError: null,
  };
}

function xeroModifiedSinceHeader(daysBack: number): string | undefined {
  if (daysBack <= 0) {
    return undefined;
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T00:00:00`;
}

export async function listVenueXeroInvoices(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<XeroInvoicesListPayload> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const summary = await getVenueXeroConnectionSummary(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
  });

  const rows = await ctx.appDb.rls((tx) =>
    invoicesRepo.listInvoices(tx, {
      venueId: context.venueId,
      fromDate: args.fromDate,
      toDate: args.toDate,
    }),
  );

  const connectionMeta = await ctx.appDb.rls((tx) =>
    xeroInvoicesRepo.getConnectionSummaryRls(tx, context.venueId),
  );

  return {
    invoices: rows.map(mapDbRowToDto),
    meta: {
      dataSource: summary.connected ? "xero" : "empty",
      xeroConnected: summary.connected,
      tenantName: summary.tenantName,
      lastSyncAt: connectionMeta?.lastInvoiceSyncAt ?? null,
      syncError: connectionMeta?.lastInvoiceSyncError ?? null,
    },
  };
}

export async function syncVenueXeroInvoices(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    daysBack?: number;
    /** When true, only sync invoice headers — line items come from attachment parse elsewhere. */
    skipApiLineItems?: boolean;
  },
): Promise<XeroInvoicesSyncPayload> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
  );

  const connection = await loadVenueXeroConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );
  if (!connection) {
    console.warn("[xero] sync: no connection for venue", {
      venueId: context.venueId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
    });
    return {
      synced: 0,
      skipped: 0,
      fetchedFromXero: 0,
      lastSyncAt: null,
      error: "Xero is not connected for this venue",
    };
  }

  console.info("[xero] sync: starting", {
    venueId: context.venueId,
    tenantId: connection.xeroTenantId,
    daysBack: args.daysBack ?? 90,
  });

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    const nowIso = new Date().toISOString();
    console.error("[xero] sync: token refresh failed", {
      venueId: context.venueId,
      message: token.message,
    });
    await xeroInvoicesRepo.updateConnectionSyncError(
      ctx.appDb,
      context.venueId,
      token.message,
    );

    return {
      synced: 0,
      skipped: 0,
      fetchedFromXero: 0,
      lastSyncAt: connection.lastInvoiceSyncAt,
      error: token.message,
    };
  }

  const daysBack =
    typeof args.daysBack === "number" && args.daysBack > 0 && args.daysBack <= 365
      ? args.daysBack
      : 90;

  const modifiedSince = xeroModifiedSinceHeader(daysBack);

  let listed = await listXeroAccpayInvoices({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    modifiedSince,
  });

  if (listed.ok && listed.invoices.length === 0 && modifiedSince) {
    console.info("[xero] sync: 0 ACCPAY bills with If-Modified-Since; retrying without filter", {
      venueId: context.venueId,
      modifiedSince,
    });
    listed = await listXeroAccpayInvoices({
      accessToken: token.accessToken,
      tenantId: connection.xeroTenantId,
    });
  }

  if (!listed.ok) {
    const nowIso = new Date().toISOString();
    console.error("[xero] sync: Xero list failed", {
      venueId: context.venueId,
      status: listed.status,
      message: listed.message,
    });
    await xeroInvoicesRepo.updateConnectionSyncError(
      ctx.appDb,
      context.venueId,
      listed.message,
    );

    return {
      synced: 0,
      skipped: 0,
      fetchedFromXero: 0,
      lastSyncAt: connection.lastInvoiceSyncAt,
      error: listed.message,
    };
  }

  console.info("[xero] sync: fetched from Xero", {
    venueId: context.venueId,
    fetched: listed.invoices.length,
    usedModifiedSince: listed.usedModifiedSince,
    httpStatuses: listed.httpStatuses,
  });

  let synced = 0;
  let skipped = 0;
  const nowIso = new Date().toISOString();

  for (const raw of listed.invoices) {
    const mapped = mapXeroApiInvoice(raw);
    if (!mapped) {
      console.warn("[xero] sync: skipped unmapped invoice", {
        invoiceId: raw.InvoiceID,
        type: raw.Type,
        status: raw.Status,
      });
      skipped += 1;
      continue;
    }

    const existingReview = await invoicesRepo.getReviewStatusAdmin(
      ctx.appDb,
      context.venueId,
      mapped.xero_invoice_id,
    );

    const reviewStatus =
      existingReview && shouldPreserveReviewStatus(existingReview)
        ? existingReview
        : mapped.review_status;

    try {
      const supplierId = await resolveSupplierIdForXeroContact(ctx, {
        organisationId: context.organisationId,
        xeroContactId: mapped.xero_contact_id,
      });

      await invoicesRepo.upsertXeroInvoice(ctx.appDb, {
        venueId: context.venueId,
        organisationId: context.organisationId,
        xeroInvoiceId: mapped.xero_invoice_id,
        invoiceNumber: mapped.invoice_number,
        supplierName: mapped.supplier_name,
        supplierId,
        xeroContactId: mapped.xero_contact_id,
        invoiceDate: mapped.invoice_date,
        dueDate: mapped.due_date,
        documentType: mapped.document_type,
        totalCents: mapped.total_cents,
        amountDueCents: mapped.amount_due_cents,
        currencyCode: mapped.currency_code,
        xeroStatus: mapped.xero_status,
        reviewStatus,
        source: "xero",
        reference: mapped.reference,
        xeroUpdatedAt: mapped.xero_updated_at,
        syncedAt: nowIso,
        updatedAt: nowIso,
      });

      const invoiceRows = await ctx.appDb.admin
        .select()
        .from(venueInvoices)
        .where(
          and(
            eq(venueInvoices.venueId, context.venueId),
            eq(venueInvoices.xeroInvoiceId, mapped.xero_invoice_id),
          ),
        )
        .limit(1);

      const invoiceRow = invoiceRows[0];
      if (invoiceRow && token.ok && !args.skipApiLineItems) {
        const detail = await getXeroAccountingInvoice({
          accessToken: token.accessToken,
          tenantId: connection.xeroTenantId,
          xeroInvoiceId: mapped.xero_invoice_id,
        });
        if (detail.ok && detail.invoice.LineItems?.length) {
          await invoicesRepo.replaceLineItems(ctx.appDb, {
            invoiceId: invoiceRow.id,
            organisationId: context.organisationId,
            venueId: context.venueId,
            lines: detail.invoice.LineItems.map((line, index) => ({
              parsedDescription: line.Description?.trim() ?? null,
              quantity: line.Quantity ?? null,
              unit: null,
              unitPriceCents: dollarsToCents(line.UnitAmount),
              lineTotalCents: dollarsToCents(line.LineAmount),
              isUnmapped: true,
              mappingMethod: null,
              sortOrder: index,
            })),
          });
        }
        await checkAndMarkDuplicate(ctx, invoiceRow.id, context.venueId);
        await runPoMatchForInvoice(
          ctx,
          invoiceRow.id,
          context.venueId,
          context.organisationId,
        );
      }
    } catch (error) {
      const pgCode =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: unknown }).code)
          : undefined;
      console.error("[xero] sync: upsert failed", {
        venueId: context.venueId,
        xeroInvoiceId: mapped.xero_invoice_id,
        invoiceNumber: mapped.invoice_number,
        pgCode,
        error: error instanceof Error ? error.message : error,
      });
      skipped += 1;
      continue;
    }

    synced += 1;
  }

  await xeroInvoicesRepo.markConnectionSyncSuccess(
    ctx.appDb,
    context.venueId,
    nowIso,
  );

  if (synced > 0) {
    try {
      await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
        organisationId: context.organisationId,
        venueId: context.venueId,
      });
    } catch (error) {
      console.error("[xero] sync: raw catalog aggregation failed", {
        venueId: context.venueId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  console.info("[xero] sync: complete", {
    venueId: context.venueId,
    fetchedFromXero: listed.invoices.length,
    synced,
    skipped,
  });

  return {
    synced,
    skipped,
    fetchedFromXero: listed.invoices.length,
    lastSyncAt: nowIso,
    error: null,
  };
}

export async function getVenueXeroInvoiceDetail(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  },
): Promise<VenueXeroInvoiceDetailPayload> {
  const { context, invoice } = await resolveVenueInvoice(ctx, args);

  const attachmentsPayload = await fetchVenueXeroInvoiceAttachments(
    ctx,
    context.venueId,
    invoice.xeroInvoiceId,
  );

  const connection = await loadVenueXeroConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );
  if (!connection) {
    return {
      invoice,
      lineItems: [],
      subTotalCents: null,
      totalTaxCents: null,
      xeroUrl: xeroBillViewUrl(invoice.xeroInvoiceId),
      lineItemsSource: "unavailable",
      lineItemsError: "Xero is not connected",
      ...attachmentsPayload,
    };
  }

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    return {
      invoice,
      lineItems: [],
      subTotalCents: null,
      totalTaxCents: null,
      xeroUrl: xeroBillViewUrl(invoice.xeroInvoiceId),
      lineItemsSource: "unavailable",
      lineItemsError: token.message,
      ...attachmentsPayload,
    };
  }

  const fetched = await getXeroAccountingInvoice({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    xeroInvoiceId: invoice.xeroInvoiceId,
  });

  if (!fetched.ok) {
    return {
      invoice,
      lineItems: [],
      subTotalCents: null,
      totalTaxCents: null,
      xeroUrl: xeroBillViewUrl(invoice.xeroInvoiceId),
      lineItemsSource: "unavailable",
      lineItemsError: fetched.message,
      ...attachmentsPayload,
    };
  }

  const raw = fetched.invoice;
  const lineItems = (raw.LineItems ?? []).map(mapXeroLineItem);

  return {
    invoice,
    lineItems,
    subTotalCents: dollarsToCents(raw.SubTotal),
    totalTaxCents: dollarsToCents(raw.TotalTax),
    xeroUrl: raw.Url?.trim() || xeroBillViewUrl(invoice.xeroInvoiceId),
    lineItemsSource: "xero",
    lineItemsError: null,
    ...attachmentsPayload,
  };
}

export async function listVenueXeroInvoiceAttachments(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  },
): Promise<VenueXeroInvoiceAttachmentsPayload> {
  const { context, invoice } = await resolveVenueInvoice(ctx, args);
  return fetchVenueXeroInvoiceAttachments(
    ctx,
    context.venueId,
    invoice.xeroInvoiceId,
  );
}

export async function downloadVenueXeroInvoiceAttachment(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    fileName: string;
  },
): Promise<
  | { ok: true; data: ArrayBuffer; mimeType: string; fileName: string }
  | { ok: false; message: string; status: number }
> {
  const { context, invoice } = await resolveVenueInvoice(ctx, args);

  const connection = await loadVenueXeroConnectionForVenue(
    ctx.appDb,
    context.venueId,
  );
  if (!connection) {
    return { ok: false, message: "Xero is not connected", status: 503 };
  }

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    return { ok: false, message: token.message, status: 503 };
  }

  const attachments = await fetchVenueXeroInvoiceAttachments(
    ctx,
    context.venueId,
    invoice.xeroInvoiceId,
  );
  const match = attachments.attachments.find(
    (row) => row.fileName === args.fileName.trim(),
  );
  if (!match) {
    return { ok: false, message: "Attachment not found", status: 404 };
  }

  return getXeroAccountingInvoiceAttachment({
    accessToken: token.accessToken,
    tenantId: connection.xeroTenantId,
    xeroInvoiceId: invoice.xeroInvoiceId,
    fileName: match.fileName,
    mimeType: match.mimeType,
  });
}
