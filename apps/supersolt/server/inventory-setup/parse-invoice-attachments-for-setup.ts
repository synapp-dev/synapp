import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import pLimit from "p-limit";

import type { RequestAuthContext } from "@/server/auth/context";
import { venueInvoices } from "@/server/db/schema";
import { parseInvoiceAttachmentIfNeeded } from "@/server/invoices/invoice-attachment-parse.service";
import type {
  ImportJobInvoiceActivity,
  ImportJobStepProgress,
} from "@/server/inventory-setup/inventory-setup-import-job.types";

/** How many recently-read invoices to surface in the live activity feed. */
const RECENT_ACTIVITY_LIMIT = 6;

/**
 * How many invoices to read (download + LLM extract) at once. Each invoice does a
 * Xero attachment download followed by one Claude call, so the *binding* constraint
 * for a Xero import is Xero's API, not the model — Xero allows ~5 concurrent
 * requests per tenant and returns 429 above that. Keep this at/below 5 unless the
 * attachments are local (already downloaded), in which case the Anthropic rate
 * limit is the only ceiling and this can go much higher. Override per-environment
 * with INVOICE_PARSE_CONCURRENCY.
 */
const INVOICE_PARSE_CONCURRENCY = 5;


export type InventorySetupInvoiceParseSummary = {
  attempted: number;
  parsed: number;
  /** Already parsed on a prior run (cache hit) — skipped so re-runs resume. */
  alreadyParsed: number;
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
        supplierName: venueInvoices.supplierName,
        invoiceNumber: venueInvoices.invoiceNumber,
        totalCents: venueInvoices.totalCents,
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
    alreadyParsed: 0,
    skippedNoAttachment: 0,
    backfilledFromXeroApi: 0,
    failed: [],
  };

  const total = invoiceRows.length;

  // Read invoices concurrently with a bounded pool (p-limit). Each invoice parse
  // is fully self-contained (own scope resolution, attachment download, single LLM
  // call, own DB writes), so the only shared state is the summary/backfill
  // accumulators below — safe to mutate from these tasks because JS runs them on a
  // single thread. Every task swallows its own errors so one bad invoice can never
  // sink the run; Promise.allSettled is belt-and-suspenders for that guarantee.
  const concurrency = Math.max(
    1,
    Number(process.env.INVOICE_PARSE_CONCURRENCY) || INVOICE_PARSE_CONCURRENCY,
  );
  const limit = pLimit(concurrency);

  // Count completions, not loop index: invoices now finish out of order, so the
  // "Reading invoice X of N" counter must advance on each settle, not on dispatch.
  let completed = 0;
  const startedAtMs = Date.now();
  // Newest-first ring of recently-read invoices, for the live activity feed.
  const recent: ImportJobInvoiceActivity[] = [];

  await Promise.allSettled(
    invoiceRows.map((invoice) =>
      limit(async () => {
        let items = 0;
        let ok = true;
        try {
          const result = await parseInvoiceAttachmentIfNeeded(ctx, {
            organisationSlug: args.organisationSlug,
            venueSlug: args.venueSlug,
            invoiceId: invoice.id,
            // Resume, don't redo: skip bills already parsed on a prior run (the
            // fingerprint cache). Only unparsed/failed bills are re-attempted, so
            // a re-run after a throttled/interrupted import picks up where it left
            // off instead of re-downloading + re-LLM'ing everything.
            force: false,
          });

          if (result.parsed) {
            summary.parsed += 1;
            items = result.lineItemCount;
          } else if (result.error) {
            summary.failed.push({ invoiceId: invoice.id, reason: result.error });
            ok = false;
          } else if (result.skipped && result.fingerprint) {
            // Cache hit — already parsed on a prior run; keep its existing items.
            summary.alreadyParsed += 1;
            items = result.lineItemCount;
          } else if (result.skipped && invoice.xeroInvoiceId) {
            // No parseable attachment — count it, but do NOT backfill from the Xero
            // API: those lines are GL/Hubdoc reference junk, not real products.
            summary.skippedNoAttachment += 1;
          }
        } catch (error) {
          summary.failed.push({
            invoiceId: invoice.id,
            reason: error instanceof Error ? error.message : "Parse failed",
          });
          ok = false;
        } finally {
          completed += 1;
          recent.unshift({
            id: invoice.id,
            supplier: invoice.supplierName,
            number: invoice.invoiceNumber,
            amountCents: invoice.totalCents,
            items,
            ok,
          });
          if (recent.length > RECENT_ACTIVITY_LIMIT) recent.length = RECENT_ACTIVITY_LIMIT;
          await args.onProgress?.({
            current: completed,
            total,
            detail: `Reading invoice ${completed} of ${total}…`,
            elapsedMs: Date.now() - startedAtMs,
            recent: [...recent],
          });
        }
      }),
    ),
  );

  // The Xero-API line-item backfill for no-attachment invoices was removed: those
  // bills (Hubdoc-sourced) only carry GL/reference lines in the Xero API
  // ("Hubdoc - 924177766", tax-exempt splits, null descriptions) — not real products
  // — so it polluted the raw-item catalog with junk. We keep ONLY the itemized lines
  // extracted from invoice PDFs.
  console.info("[inventory-setup] invoice_attachment_parse", {
    venueId: args.venueId,
    ...summary,
    failedCount: summary.failed.length,
  });

  return summary;
}
