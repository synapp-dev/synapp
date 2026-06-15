import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { venueInvoices } from "@/server/db/schema";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { parseInvoiceAttachmentIfNeeded } from "@/server/invoices/invoice-attachment-parse.service";
import {
  ensureVenueXeroAccessToken,
  loadVenueXeroConnectionForVenue,
} from "@/server/xero/load-venue-xero-connection";
import { getXeroAccountingInvoice } from "@/server/xero/get-accounting-invoice";
import type { ImportJobStepProgress } from "@/server/inventory-setup/inventory-setup-import-job.types";

function dollarsToCents(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

export type InventorySetupInvoiceParseSummary = {
  attempted: number;
  parsed: number;
  skippedNoAttachment: number;
  backfilledFromXeroApi: number;
  failed: Array<{ invoiceId: string; reason: string }>;
};

/**
 * Inventory setup prefers PDF/attachment extraction (same path as Purchasing → Invoices).
 * Xero API line items are only used when no parseable attachment exists.
 */
export async function parseInvoiceAttachmentsForInventorySetup(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    organisationId: string;
    venueId: string;
    /** When provided, only parse invoices belonging to these suppliers (selection gate). */
    supplierIds?: string[];
    onProgress?: (progress: ImportJobStepProgress & { detail: string }) => Promise<void>;
  },
): Promise<InventorySetupInvoiceParseSummary> {
  const invoiceRows = await ctx.appDb.rls(async (tx) =>
    tx
      .select({
        id: venueInvoices.id,
        xeroInvoiceId: venueInvoices.xeroInvoiceId,
      })
      .from(venueInvoices)
      .where(
        and(
          eq(venueInvoices.organisationId, args.organisationId),
          eq(venueInvoices.venueId, args.venueId),
          isNull(venueInvoices.archivedAt),
          isNotNull(venueInvoices.supplierId),
          args.supplierIds
            ? inArray(venueInvoices.supplierId, args.supplierIds)
            : undefined,
        ),
      ),
  );

  const summary: InventorySetupInvoiceParseSummary = {
    attempted: invoiceRows.length,
    parsed: 0,
    skippedNoAttachment: 0,
    backfilledFromXeroApi: 0,
    failed: [],
  };

  const needsXeroApiBackfill: Array<{ id: string; xeroInvoiceId: string }> = [];
  const total = invoiceRows.length;

  for (let index = 0; index < invoiceRows.length; index += 1) {
    const invoice = invoiceRows[index]!;
    await args.onProgress?.({
      current: index + 1,
      total,
      detail: `Reading invoice ${index + 1} of ${total}…`,
    });

    try {
      const result = await parseInvoiceAttachmentIfNeeded(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        invoiceId: invoice.id,
        force: true,
      });

      if (result.parsed) {
        summary.parsed += 1;
        continue;
      }

      if (result.error) {
        summary.failed.push({ invoiceId: invoice.id, reason: result.error });
        continue;
      }

      if (result.skipped && invoice.xeroInvoiceId) {
        needsXeroApiBackfill.push({
          id: invoice.id,
          xeroInvoiceId: invoice.xeroInvoiceId,
        });
        summary.skippedNoAttachment += 1;
      }
    } catch (error) {
      summary.failed.push({
        invoiceId: invoice.id,
        reason: error instanceof Error ? error.message : "Parse failed",
      });
    }
  }

  if (needsXeroApiBackfill.length === 0) {
    console.info("[inventory-setup] invoice_attachment_parse", {
      venueId: args.venueId,
      ...summary,
      failedCount: summary.failed.length,
    });
    return summary;
  }

  const connection = await loadVenueXeroConnectionForVenue(ctx.appDb, args.venueId);
  if (!connection) {
    return summary;
  }

  const token = await ensureVenueXeroAccessToken(ctx.appDb, connection);
  if (!token.ok) {
    return summary;
  }

  for (const invoice of needsXeroApiBackfill) {
    const existingLines = await ctx.appDb.rls((tx) =>
      invoicesRepo.listLineItems(tx, invoice.id),
    );
    if (existingLines.length > 0) {
      continue;
    }

    const detail = await getXeroAccountingInvoice({
      accessToken: token.accessToken,
      tenantId: connection.xeroTenantId,
      xeroInvoiceId: invoice.xeroInvoiceId,
    });

    if (!detail.ok || !detail.invoice.LineItems?.length) {
      continue;
    }

    await invoicesRepo.replaceLineItems(ctx.appDb, {
      invoiceId: invoice.id,
      organisationId: args.organisationId,
      venueId: args.venueId,
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
    summary.backfilledFromXeroApi += 1;
  }

  console.info("[inventory-setup] invoice_attachment_parse", {
    venueId: args.venueId,
    ...summary,
    failedCount: summary.failed.length,
  });

  return summary;
}
