import pLimit from "p-limit";
import { and, desc, eq, isNull } from "drizzle-orm";

import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { InventorySetupServiceError } from "@/server/inventory-setup/inventory-setup.service";
import { InventorySetupImportJobTracker } from "@/server/inventory-setup/inventory-setup-import-job.tracker";
import { inventorySetupImportJobRepo } from "@/server/inventory-setup/inventory-setup-import-job.repo";
import type {
  ImportJobInvoiceActivity,
  ImportJobStepLogEvent,
} from "@/server/inventory-setup/inventory-setup-import-job.types";
import { inferDeliverySchedulesFromInvoices } from "@/server/inventory-setup/infer-delivery-schedule";
import { aggregateInvoiceLinesToRawCatalogForVenue } from "@/server/supplier-raw-items/aggregate-invoice-lines";
import { propagateReimportInvoicePrices } from "@/server/supplier-products/supplier-products.service";
import { syncVenueXeroInvoices } from "@/server/xero/xero-invoices.service";
import {
  getLastXeroThrottleEvent,
  getXeroThrottlePauseUntilMs,
  XeroRateLimitError,
} from "@/server/xero/xero-request-queue";
import {
  parseInvoiceAttachmentIfNeeded,
  type ParsedSupplierHeader,
} from "@/server/invoices/invoice-attachment-parse.service";
import { invoicesRepo } from "@/server/invoices/invoices.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  abnKey,
  decideSupplierIdentity,
  nameKey,
} from "@/server/suppliers/supplier-identity";
import { venueInvoices } from "@/server/db/schema";

const PARSE_CONCURRENCY = Math.max(
  1,
  Number(process.env.INVOICE_PARSE_CONCURRENCY) || 5,
);

/** How many recently-processed invoices the live activity feed shows. */
const RECENT_ACTIVITY_LIMIT = 8;

/** How many diagnostic log lines each step's event log keeps (newest first). */
const STEP_EVENT_LIMIT = 12;

export type InvoiceFirstImportResult = {
  invoices: {
    synced: number;
    parsed: number;
    alreadyParsed: number;
    noAttachment: number;
    failed: number;
  };
  suppliers: {
    created: number;
    matchedByAbn: number;
    matchedByName: number;
  };
  rawItems: { upserted: number; skipped: number };
  deliverySuggestions: { suppliersSuggested: number };
  error: string | null;
};

type ResolvedSupplier = {
  id: string;
  name: string;
  action: "matched_abn" | "matched_name" | "created";
};

/**
 * Invoice-first Xero import: pull every bill from the last year, read each
 * PDF, and build the supplier list from the invoice headers themselves —
 * ABN first, then name (exact, then whole-token containment), minting a new
 * supplier when nothing matches. Bills with zero extracted lines (delivery
 * dockets, statements) may match but never mint. No contact sync, no
 * supplier-selection gate. Emits a per-invoice live feed via the job tracker
 * so the user watches their catalog assemble itself.
 */
export async function runInvoiceFirstImport(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    daysBack?: number;
    jobId?: string;
  },
): Promise<InvoiceFirstImportResult> {
  const scope = await resolveVenueScopeForService(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    {
      notFound: (message) => new InventorySetupServiceError(404, message),
      forbidden: (auth) => new InventorySetupServiceError(auth.status, auth.message),
    },
  );
  assertInventorySetupWriteAccess(ctx.tenantRoles, {
    organisationId: scope.organisationId,
    venueId: scope.venueId,
  });

  let tracker: InventorySetupImportJobTracker | null = null;
  if (args.jobId) {
    const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
    if (!job || job.venueId !== scope.venueId) {
      throw new InventorySetupServiceError(404, "Import job not found");
    }
    if (job.status === "completed" && job.result) {
      return job.result as InvoiceFirstImportResult;
    }
    if (job.status === "running") {
      throw new InventorySetupServiceError(409, "Import already in progress");
    }
    if (job.status === "failed") {
      throw new InventorySetupServiceError(500, job.errorMessage ?? "Import failed");
    }
    tracker = new InventorySetupImportJobTracker(ctx.appDb, args.jobId, job.steps);
    const claimed = await tracker.start();
    if (!claimed) {
      const refreshed = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
      if (refreshed?.status === "completed" && refreshed.result) {
        return refreshed.result as InvoiceFirstImportResult;
      }
      throw new InventorySetupServiceError(409, "Import already in progress");
    }
  }

  console.info("[inventory-setup] invoice_first_import_started", {
    venueId: scope.venueId,
    userId: ctx.userId,
    jobId: args.jobId ?? null,
  });

  let cancelWatcher: ReturnType<typeof setInterval> | null = null;
  // Which step to mark failed if we die mid-run — keeps that step's diagnostic
  // event log visible on the failure screen instead of leaving all steps green.
  let currentFailStep: "invoices" | "parse_pdfs" | "raw_items" | "delivery" =
    "invoices";

  try {
    // User-requested abort + throttle visibility, live from the very first
    // step: the watcher polls our job row for cancellation AND re-publishes
    // the latest progress with the current Xero pause timestamp, so a full
    // throttle stall shows a countdown instead of a silent freeze.
    let cancelled = false;
    let lastWrittenPauseMs = 0;
    let lastHeartbeat: {
      stepId: "invoices" | "parse_pdfs";
      detail: string;
      progress?: {
        current: number;
        total: number;
        elapsedMs?: number;
        recent?: ImportJobInvoiceActivity[];
      };
    } = { stepId: "invoices", detail: "Collecting your bills from Xero…" };

    // Per-step diagnostic log, published with every progress write so the UI
    // can show WHAT the import is doing (connecting, page fetches, 429 hits)
    // rather than a single mutating detail line. Cleared at each step change.
    const stepEvents: ImportJobStepLogEvent[] = [];
    const pushStepEvent = (
      text: string,
      kind: ImportJobStepLogEvent["kind"] = "info",
    ) => {
      stepEvents.unshift({ at: new Date().toISOString(), text, kind });
      if (stepEvents.length > STEP_EVENT_LIMIT) stepEvents.pop();
    };

    // Always a complete progress payload — even before totals exist — so the
    // throttle countdown and event log render from the first second of a run.
    const heartbeatProgress = () => ({
      current: 0,
      total: 0,
      ...(lastHeartbeat.progress ?? {}),
      throttledUntilMs: getXeroThrottlePauseUntilMs() || null,
      events: [...stepEvents],
    });

    if (args.jobId) {
      const jobId = args.jobId;
      let lastThrottleSeq = 0;
      cancelWatcher = setInterval(() => {
        void inventorySetupImportJobRepo
          .getById(ctx.appDb, jobId)
          .then((row) => {
            if (row && row.status !== "running") cancelled = true;
          })
          .catch(() => undefined);

        // Any 429 the request queue absorbed since the last tick becomes a
        // visible log line — an instant throttle on the first call included.
        const throttleEvent = getLastXeroThrottleEvent();
        const newThrottle =
          throttleEvent != null && throttleEvent.seq !== lastThrottleSeq;
        if (newThrottle) {
          lastThrottleSeq = throttleEvent.seq;
          pushStepEvent(
            `Hit Xero's rate limit — pausing ${throttleEvent.waitSeconds}s (attempt ${throttleEvent.attempt})`,
            "throttle",
          );
        }

        const pauseUntil = getXeroThrottlePauseUntilMs();
        // Write on throttle hits and pause arm/extend/clear transitions only —
        // not every tick.
        if (
          (newThrottle || Math.abs(pauseUntil - lastWrittenPauseMs) > 1_500) &&
          !cancelled
        ) {
          lastWrittenPauseMs = pauseUntil;
          void tracker
            ?.updateStepDetail(
              lastHeartbeat.stepId,
              pauseUntil > 0
                ? "Xero asked us to slow down — waiting out the cooldown…"
                : lastHeartbeat.detail,
              heartbeatProgress(),
            )
            .catch(() => undefined);
        }
      }, 3_000);
    }

    // ── 1. Get every bill from the last year (headers only) ────────────────
    await tracker?.beginStep("invoices");
    pushStepEvent("Import started — reaching out to Xero…");
    await tracker?.updateStepDetail(
      "invoices",
      lastHeartbeat.detail,
      heartbeatProgress(),
    );
    const sync = await syncVenueXeroInvoices(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      daysBack: args.daysBack ?? 365,
      skipApiLineItems: true,
      setupImport: true,
      onProgress: async (p) => {
        if (p.event) pushStepEvent(p.detail);
        lastHeartbeat = {
          stepId: "invoices",
          detail: p.detail,
          progress:
            p.total != null
              ? { current: p.current ?? 0, total: p.total }
              : lastHeartbeat.progress,
        };
        await tracker?.updateStepDetail("invoices", p.detail, heartbeatProgress());
      },
    });
    if (sync.error && sync.synced === 0) {
      await tracker?.failStep("invoices", sync.error);
      await tracker?.fail(sync.error);
      throw new InventorySetupServiceError(502, sync.error);
    }
    await tracker?.completeStep(
      "invoices",
      `${sync.synced} bills found in the last 12 months`,
    );

    // ── 2. Read each invoice, resolving its supplier from the header ───────
    currentFailStep = "parse_pdfs";
    await tracker?.beginStep("parse_pdfs");
    // Fresh diagnostic log for the new step — sync-stage lines would only
    // confuse the parse feed.
    stepEvents.length = 0;

    const invoiceRows = await ctx.appDb.rls((tx) =>
      tx
        .select({
          id: venueInvoices.id,
          supplierId: venueInvoices.supplierId,
          supplierName: venueInvoices.supplierName,
          xeroContactId: venueInvoices.xeroContactId,
          invoiceNumber: venueInvoices.invoiceNumber,
          totalCents: venueInvoices.totalCents,
          hasAttachments: venueInvoices.hasAttachments,
        })
        .from(venueInvoices)
        .where(
          and(
            eq(venueInvoices.organisationId, scope.organisationId),
            eq(venueInvoices.venueId, scope.venueId),
            isNull(venueInvoices.archivedAt),
          ),
        )
        .orderBy(desc(venueInvoices.invoiceDate)),
    );

    // Supplier identity state, seeded from whatever already exists so re-runs
    // and partially-imported venues resolve instead of duplicating.
    const existingSuppliers = await ctx.appDb.rls((tx) =>
      suppliersRepo.getAllForVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      }),
    );
    const byAbn = new Map<string, { id: string; name: string }>();
    const byName = new Map<string, { id: string; name: string }>();
    // Every supplier the venue knows about (plus ones minted this run), for
    // the fold-before-mint name-containment check.
    const knownSuppliers: Array<{ id: string; name: string }> = [];
    const claimedContactIds = new Set<string>();
    for (const supplier of existingSuppliers) {
      const abn = abnKey(supplier.abn);
      if (abn && !byAbn.has(abn)) byAbn.set(abn, { id: supplier.id, name: supplier.name });
      const name = nameKey(supplier.name);
      if (name && !byName.has(name)) byName.set(name, { id: supplier.id, name: supplier.name });
      knownSuppliers.push({ id: supplier.id, name: supplier.name });
      if (supplier.xeroContactId) claimedContactIds.add(supplier.xeroContactId);
    }

    // Resolution is serialized so two in-flight parses of the same new
    // supplier can't both mint it; parsing itself stays 5-wide.
    let resolveChain: Promise<unknown> = Promise.resolve();
    const withResolverLock = <T>(fn: () => Promise<T>): Promise<T> => {
      const run = resolveChain.then(fn);
      resolveChain = run.catch(() => undefined);
      return run;
    };

    const resolveSupplierFromHeader = async (
      invoice: (typeof invoiceRows)[number],
      header: ParsedSupplierHeader,
      lineItemCount: number,
    ): Promise<ResolvedSupplier | null> =>
      withResolverLock(async () => {
        const decision = decideSupplierIdentity({
          header,
          invoiceSupplierName: invoice.supplierName,
          lineItemCount,
          byAbn,
          byName,
          knownSuppliers,
        });
        if (decision.kind === "skip") return null;
        if (decision.kind === "matched") {
          if (decision.via === "name_containment") {
            // Remember the short/long alias so the next invoice carrying this
            // exact name resolves from the map instead of re-folding.
            const alias = nameKey(header.name ?? invoice.supplierName);
            if (alias && !byName.has(alias)) byName.set(alias, decision.supplier);
          }
          return {
            ...decision.supplier,
            action: decision.via === "abn" ? "matched_abn" : "matched_name",
          };
        }

        const contactId =
          invoice.xeroContactId && !claimedContactIds.has(invoice.xeroContactId)
            ? invoice.xeroContactId
            : null;
        const created = await ctx.appDb.rls((tx) =>
          suppliersRepo.createSupplier(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
            name: decision.name,
            abn: decision.abn,
            email: header.email,
            phone: header.phone,
            addressLine1: header.addressLine1,
            addressLine2: header.addressLine2,
            suburb: header.suburb,
            state: header.state,
            postcode: header.postcode,
            category: "other",
            isInventorySource: true,
            xeroContactId: contactId,
            detailsSourceInvoiceDate: header.invoiceDate,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          }),
        );
        const abn = abnKey(decision.abn);
        if (abn) byAbn.set(abn, { id: created.id, name: created.name });
        const name = nameKey(created.name);
        if (name) byName.set(name, { id: created.id, name: created.name });
        knownSuppliers.push({ id: created.id, name: created.name });
        if (contactId) claimedContactIds.add(contactId);
        return { id: created.id, name: created.name, action: "created" };
      });

    const result: InvoiceFirstImportResult = {
      invoices: {
        synced: sync.synced,
        parsed: 0,
        alreadyParsed: 0,
        noAttachment: 0,
        failed: 0,
      },
      suppliers: { created: 0, matchedByAbn: 0, matchedByName: 0 },
      rawItems: { upserted: 0, skipped: 0 },
      deliverySuggestions: { suppliersSuggested: 0 },
      error: sync.error,
    };

    const total = invoiceRows.length;
    let completed = 0;
    const startedAt = Date.now();
    const recent: ImportJobInvoiceActivity[] = [];

    pushStepEvent(
      `Reading ${total} invoice${total === 1 ? "" : "s"}, ${PARSE_CONCURRENCY} at a time…`,
    );

    const pushActivity = async (activity: ImportJobInvoiceActivity) => {
      completed += 1;
      recent.unshift(activity);
      if (recent.length > RECENT_ACTIVITY_LIMIT) recent.pop();
      const detail = `Reading invoice ${completed} of ${total}…`;
      const progress = {
        current: completed,
        total,
        elapsedMs: Date.now() - startedAt,
        recent: [...recent],
      };
      lastHeartbeat = { stepId: "parse_pdfs", detail, progress };
      await tracker?.updateStepDetail("parse_pdfs", detail, {
        ...progress,
        throttledUntilMs: getXeroThrottlePauseUntilMs() || null,
        events: [...stepEvents],
      });
    };

    // Throttle casualties from the first pass — re-attempted gently at the end,
    // once the minute windows have breathed. Being asked to wait by Xero must
    // not cost the user a bill.
    const retryQueue: typeof invoiceRows = [];

    // Xero's daily budget ran out mid-run: nothing else will succeed today, so
    // stop cleanly, keep everything read so far, and say when it frees up.
    let rateLimitStop: XeroRateLimitError | null = null;

    const processInvoice = async (
      invoice: (typeof invoiceRows)[number],
      opts: { isRetry: boolean },
    ) => {
          if (cancelled || rateLimitStop) return;
          const base: ImportJobInvoiceActivity = {
            id: invoice.id,
            supplier: invoice.supplierName,
            number: invoice.invoiceNumber,
            amountCents: invoice.totalCents,
            items: 0,
            ok: true,
            supplierAction: null,
          };

          // Xero told us this bill carries no file — nothing to read.
          if (invoice.hasAttachments === false) {
            result.invoices.noAttachment += 1;
            await pushActivity(base);
            return;
          }

          try {
            const parse = await parseInvoiceAttachmentIfNeeded(ctx, {
              organisationSlug: args.organisationSlug,
              venueSlug: args.venueSlug,
              invoiceId: invoice.id,
            });

            if (parse.error) {
              if (opts.isRetry) {
                result.invoices.failed += 1;
                await pushActivity({ ...base, ok: false });
              } else {
                retryQueue.push(invoice);
              }
              return;
            }
            if (parse.skipped && !parse.fingerprint) {
              result.invoices.noAttachment += 1;
              await pushActivity(base);
              return;
            }
            if (parse.skipped) {
              result.invoices.alreadyParsed += 1;
            } else {
              result.invoices.parsed += 1;
            }

            let supplierName = invoice.supplierName;
            let supplierAction: ImportJobInvoiceActivity["supplierAction"] = null;
            if (!invoice.supplierId && parse.supplierHeader) {
              const resolved = await resolveSupplierFromHeader(
                invoice,
                parse.supplierHeader,
                parse.lineItemCount,
              );
              if (resolved) {
                supplierName = resolved.name;
                supplierAction = resolved.action;
                if (resolved.action === "created") result.suppliers.created += 1;
                if (resolved.action === "matched_abn") result.suppliers.matchedByAbn += 1;
                if (resolved.action === "matched_name") result.suppliers.matchedByName += 1;

                await invoicesRepo.updateInvoiceAdmin(ctx.appDb, invoice.id, {
                  supplierId: resolved.id,
                });
                // The parse-time enrichment skipped (no supplierId yet) — apply
                // the header to the matched supplier now, most-recent wins.
                if (resolved.action !== "created" && parse.supplierHeader.invoiceDate) {
                  const header = parse.supplierHeader;
                  await ctx.appDb.rls((tx) =>
                    suppliersRepo.enrichDetailsFromInvoice(tx, {
                      organisationId: scope.organisationId,
                      supplierId: resolved.id,
                      invoiceDate: header.invoiceDate!,
                      details: {
                        abn: header.abn,
                        category: header.category,
                        email: header.email,
                        phone: header.phone,
                        addressLine1: header.addressLine1,
                        addressLine2: header.addressLine2,
                        suburb: header.suburb,
                        state: header.state,
                        postcode: header.postcode,
                      },
                    }),
                  );
                }
              }
            }

            await pushActivity({
              ...base,
              supplier: supplierName,
              items: parse.lineItemCount,
              supplierAction,
            });
          } catch (error) {
            if (error instanceof XeroRateLimitError) {
              // Day budget spent — this bill stays unread (NOT failed) and the
              // next run picks it up. Flag the stop so in-flight work drains.
              rateLimitStop = error;
              return;
            }
            console.warn("[inventory-setup] invoice_first_parse_failed", {
              invoiceId: invoice.id,
              isRetry: opts.isRetry,
              message: error instanceof Error ? error.message : error,
            });
            if (opts.isRetry) {
              result.invoices.failed += 1;
              await pushActivity({ ...base, ok: false });
            } else {
              retryQueue.push(invoice);
            }
          }
    };

    const limit = pLimit(PARSE_CONCURRENCY);
    await Promise.allSettled(
      invoiceRows.map((invoice) =>
        limit(() => processInvoice(invoice, { isRetry: false })),
      ),
    );

    // Second pass: whatever the throttle knocked over gets one calm retry at
    // low concurrency, after the per-minute windows have refilled.
    if (retryQueue.length > 0 && !cancelled && !rateLimitStop) {
      pushStepEvent(
        `Retrying ${retryQueue.length} bill${retryQueue.length === 1 ? "" : "s"} that hit Xero's rate limit…`,
      );
      await tracker?.updateStepDetail(
        "parse_pdfs",
        `Retrying ${retryQueue.length} bill${retryQueue.length === 1 ? "" : "s"} that hit Xero's rate limit…`,
        heartbeatProgress(),
      );
      const retryLimit = pLimit(2);
      await Promise.allSettled(
        retryQueue
          .splice(0)
          .map((invoice) => retryLimit(() => processInvoice(invoice, { isRetry: true }))),
      );
    }

    if (cancelWatcher) {
      clearInterval(cancelWatcher);
      cancelWatcher = null;
    }

    if (rateLimitStop) {
      const stop: XeroRateLimitError = rateLimitStop;
      pushStepEvent(stop.message, "error");
      await tracker?.updateStepDetail(
        "parse_pdfs",
        stop.message,
        heartbeatProgress(),
      );
      await tracker?.failStep("parse_pdfs", stop.message);
      await tracker?.fail(stop.message);
      console.info("[inventory-setup] invoice_first_import_rate_limited", {
        venueId: scope.venueId,
        jobId: args.jobId ?? null,
        parsed: result.invoices.parsed,
        suppliersCreated: result.suppliers.created,
        retryAfterSeconds: stop.retryAfterSeconds,
      });
      return result;
    }

    if (cancelled) {
      // The cancel route already marked the job failed with a clear message —
      // just stop here. Everything parsed so far stays; a re-run resumes free.
      console.info("[inventory-setup] invoice_first_import_cancelled", {
        venueId: scope.venueId,
        jobId: args.jobId ?? null,
        parsed: result.invoices.parsed,
        suppliersCreated: result.suppliers.created,
      });
      return result;
    }

    await tracker?.completeStep(
      "parse_pdfs",
      `${result.invoices.parsed + result.invoices.alreadyParsed} invoices read · ${result.suppliers.created} suppliers created` +
        (result.invoices.failed > 0 ? ` · ${result.invoices.failed} failed` : ""),
    );

    // ── 3. Build the per-supplier item catalog ──────────────────────────────
    currentFailStep = "raw_items";
    await tracker?.beginStep("raw_items");
    const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    result.rawItems = { upserted: rawItems.upserted, skipped: rawItems.skipped };
    const repriced = await propagateReimportInvoicePrices(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    await tracker?.completeStep(
      "raw_items",
      `${rawItems.upserted} items catalogued` +
        (repriced.productsRepriced > 0 ? `, ${repriced.productsRepriced} repriced` : ""),
    );

    // ── 4. Delivery rhythm ─────────────────────────────────────────────────
    currentFailStep = "delivery";
    await tracker?.beginStep("delivery");
    const suppliersSuggested = await ctx.appDb.rls((tx) =>
      inferDeliverySchedulesFromInvoices(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      }),
    );
    result.deliverySuggestions = { suppliersSuggested };
    await tracker?.completeStep(
      "delivery",
      suppliersSuggested > 0
        ? `${suppliersSuggested} supplier schedules suggested`
        : "No schedule suggestions yet",
    );

    await tracker?.complete(result as unknown as Record<string, unknown>);
    console.info("[inventory-setup] invoice_first_import_completed", result);
    return result;
  } catch (error) {
    if (cancelWatcher) clearInterval(cancelWatcher);
    const message = error instanceof Error ? error.message : "Import failed";
    await tracker?.failStep(currentFailStep, message);
    await tracker?.fail(message);
    throw error;
  }
}
