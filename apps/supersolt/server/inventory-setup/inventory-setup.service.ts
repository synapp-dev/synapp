import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import {
  evaluateInventorySetupProgress,
  type InventorySetupProgress,
} from "@/server/inventory-setup/inventory-setup-progress";
import {
  applyWizardStatePatch,
  buildWizardModel,
  WIZARD_ACK_KEYS,
  type InventorySetupWizardModel,
} from "@/server/inventory-setup/wizard-model";
import { inventorySetupWizardStateRepo } from "@/server/inventory-setup/inventory-setup-wizard-state.repo";
import { storageLocationsRepo } from "@/server/stock-counts/storage-locations.repo";
import { inferDeliverySchedulesFromInvoices } from "@/server/inventory-setup/infer-delivery-schedule";
import { parseInvoiceAttachmentsForInventorySetup } from "@/server/inventory-setup/parse-invoice-attachments-for-setup";
import {
  IMPORT_JOB_SELECTION_GATE,
  INITIAL_IMPORT_JOB_STEPS,
  INITIAL_INVOICE_FIRST_IMPORT_STEPS,
  type ImportJobRow,
} from "@/server/inventory-setup/inventory-setup-import-job.types";
import { inventorySetupImportJobRepo } from "@/server/inventory-setup/inventory-setup-import-job.repo";
import { InventorySetupImportJobTracker } from "@/server/inventory-setup/inventory-setup-import-job.tracker";
import {
  resetVenueNormalisation,
  resetVenueProducts,
  wipeVenueProcurementData,
} from "@/server/inventory-setup/inventory-setup-restart.repo";
import { aggregateInvoiceLinesToRawCatalogForVenue } from "@/server/supplier-raw-items/aggregate-invoice-lines";
import { propagateReimportInvoicePrices } from "@/server/supplier-products/supplier-products.service";
import { ensureSuppliersFromPurchaseOrders } from "@/server/inventory-setup/purchase-orders-ingest";
import {
  classifySuppliersByAccount,
  isLikelyNonInventorySupplierName,
} from "@/server/inventory-setup/classify-suppliers-by-account";
import {
  foldOrphanBillsByAccount,
  isPlaceholderSupplierName,
} from "@/server/inventory-setup/fold-orphan-bills";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import {
  countReadySuppliersForVenue,
  countInventorySupplierResolutionForVenue,
} from "@/server/suppliers/suppliers.service";
import { posCatalogImportRepo } from "@/server/pos-catalog-import/pos-catalog-import.repo";
import { readinessRepo } from "@/server/readiness/readiness.repo";
import { syncVenueXeroSuppliers } from "@/server/xero/xero-suppliers.service";
import { syncVenueXeroInvoices } from "@/server/xero/xero-invoices.service";
import { describeXeroRateLimit } from "@/server/xero/xero-request-queue";

export type InventorySetupImportResult = {
  suppliers: {
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  };
  invoices: {
    synced: number;
    parsedFromAttachment: number;
    parseFailed: Array<{ invoiceId: string; reason: string }>;
  };
  rawItems: { upserted: number; skipped: number };
  deliverySuggestions: { suppliersSuggested: number };
  error: string | null;
};

export type InventorySetupRestartResult = {
  suppliersRemoved: number;
  invoicesRemoved: number;
  rawItemsRemoved: number;
  purchaseOrdersRemoved: number;
  menuItemsRemoved: number;
  importJobsRemoved: number;
};

export type InventorySetupNormalisationResetResult = {
  itemsReset: number;
  productsRemoved: number;
};

export type InventorySetupProductsResetResult = {
  recipesRemoved: number;
  mappingsRemoved: number;
};

export type InventorySetupProgressResponse = InventorySetupProgress & {
  wizard: InventorySetupWizardModel;
};

/** Supplier shown in the selection gate's picker. */
export type SelectableSupplier = {
  id: string;
  name: string;
  isInventorySource: boolean;
  email: string | null;
  orderingEmail: string | null;
  phone: string | null;
  /** Pre-tick state suggested from how the supplier's Xero bills are coded. */
  suggestedInventory: boolean;
  /** Short human reason behind the suggestion, e.g. "Bills coded to overheads (Rent)". */
  classificationReason: string | null;
};

/**
 * Interim result stashed on the job row while parked at the supplier-selection
 * gate. The scoped-parse phase reads it back to fold the suppliers/invoices
 * sync counts into the final {@link InventorySetupImportResult}, and the picker
 * UI reads `selectableSuppliers`.
 */
export type InventorySetupImportGateState = {
  stage: "awaiting_selection";
  suppliers: { created: number; updated: number; skipped: number; errors: string[] };
  selectableSuppliers: SelectableSupplier[];
};

export class InventorySetupServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new InventorySetupServiceError(error.status, error.message);
  }
  throw error;
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  try {
    return await resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
      notFound: (message) => new InventorySetupServiceError(404, message),
      forbidden: (auth) => new InventorySetupServiceError(auth.status, auth.message),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

export const inventorySetupService = {
  async getProgress(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<InventorySetupProgressResponse> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const { counts, wizardState } = await ctx.appDb.rls(async (tx) => {
      const venueCounts = await readinessRepo.getVenueCounts(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const rawItemCount = await supplierRawItemsRepo.countForOrganisationVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const statusCounts = await supplierRawItemsRepo.countByStatusForOrganisationVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const unreviewedRawItemCount =
        await supplierRawItemsRepo.countUnreviewedForOrganisationVenue(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        });
      const readySupplierCount = await countReadySuppliersForVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const inventoryResolution =
        await countInventorySupplierResolutionForVenue(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        });
      const posImportRan = await posCatalogImportRepo.hasCompletedSquareImport(tx, scope.venueId);
      const inUseMenuItemCount = await posCatalogImportRepo.countInUseWithSquareLink(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const mappedInUseCount = await posCatalogImportRepo.countMappedInUse(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const storageLocationCount = await storageLocationsRepo.countForVenue(
        tx,
        scope.venueId,
      );
      const wizardState = await inventorySetupWizardStateRepo.getForVenue(
        tx,
        scope.venueId,
      );
      return {
        counts: {
          supplierCount: venueCounts.supplierCount,
          rawItemCount,
          pendingRawItemCount: statusCounts.pending,
          normalisedRawItemCount: statusCounts.normalised,
          skippedRawItemCount: statusCounts.skipped,
          unreviewedRawItemCount,
          readySupplierCount,
          unresolvedInventorySupplierCount: inventoryResolution.unresolvedCount,
          emptyUnackedInventorySupplierCount:
            inventoryResolution.emptyUnackedCount,
          posImportRan,
          inUseMenuItemCount,
          mappedInUseCount,
          storageLocationCount,
        },
        wizardState,
      };
    });

    const progress = evaluateInventorySetupProgress(counts);
    const wizard = buildWizardModel(progress, wizardState);

    if (progress.phase2Complete) {
      console.info("[inventory-normalisation] phase2_complete", {
        venueId: scope.venueId,
      });
    }
    for (const stage of wizard.stages) {
      if (stage.complete) {
        console.info("[inventory-setup-wizard] stage_completed", {
          venueId: scope.venueId,
          stage: stage.id,
        });
      }
    }

    return { ...progress, wizard };
  },

  async createImportJob(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      /** "invoice_first" seeds the invoice-first steps (no contact sync/gate). */
      variant?: "invoice_first";
    },
  ): Promise<ImportJobRow> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const existing = await inventorySetupImportJobRepo.findActiveForVenue(ctx.appDb, {
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "xero",
    });
    if (existing) {
      return existing;
    }

    return inventorySetupImportJobRepo.create(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "xero",
      steps: structuredClone(
        args.variant === "invoice_first"
          ? INITIAL_INVOICE_FIRST_IMPORT_STEPS
          : INITIAL_IMPORT_JOB_STEPS,
      ),
    });
  },

  async getActiveImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<ImportJobRow | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    return inventorySetupImportJobRepo.findActiveForVenue(ctx.appDb, {
      venueId: scope.venueId,
      createdByUserId: ctx.userId,
      jobType: "xero",
    });
  },

  async getImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; jobId: string },
  ): Promise<ImportJobRow | null> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
    if (!job || job.venueId !== scope.venueId) {
      return null;
    }
    return job;
  },

  /**
   * User-requested abort of an in-flight import. Flips the job to failed with a
   * "Cancelled" message; the running loop polls its row and winds down. Nothing
   * already downloaded or parsed is lost — a re-run skips it via stored
   * attachments + parse fingerprints and only fetches what's missing.
   */
  async cancelImportJob(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; jobId: string },
  ): Promise<{ cancelled: boolean }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
    if (!job || job.venueId !== scope.venueId) {
      throw new InventorySetupServiceError(404, "Import job not found");
    }
    const cancelled = await inventorySetupImportJobRepo.cancel(ctx.appDb, args.jobId);
    console.info("[inventory-setup] import_cancelled", {
      venueId: scope.venueId,
      jobId: args.jobId,
      userId: ctx.userId,
      cancelled,
    });
    return { cancelled };
  },

  async importFromXero(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      daysBack?: number;
      jobId?: string;
    },
  ): Promise<InventorySetupImportResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
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
        return job.result as InventorySetupImportResult;
      }

      if (job.status === "running") {
        throw new InventorySetupServiceError(409, "Import already in progress");
      }

      if (job.status === "failed") {
        throw new InventorySetupServiceError(
          500,
          job.errorMessage ?? "Import failed",
        );
      }

      tracker = new InventorySetupImportJobTracker(ctx.appDb, args.jobId, job.steps);
      const claimed = await tracker.start();
      if (!claimed) {
        const refreshed = await inventorySetupImportJobRepo.getById(
          ctx.appDb,
          args.jobId,
        );
        if (refreshed?.status === "completed" && refreshed.result) {
          return refreshed.result as InventorySetupImportResult;
        }
        throw new InventorySetupServiceError(409, "Import already in progress");
      }
    }

    console.info("[inventory-setup] import_started", {
      venueId: scope.venueId,
      userId: ctx.userId,
      jobId: args.jobId ?? null,
    });

    try {
      await tracker?.beginStep("suppliers");
      const supplierSync = await syncVenueXeroSuppliers(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
      });

      if (supplierSync.error && supplierSync.fetchedFromXero === 0) {
        // On a Xero rate-limit, swap the raw "(429)" for a clear message with the
        // actual local time the limit resets, computed from the Retry-After header.
        const failureMessage = supplierSync.rateLimit
          ? describeXeroRateLimit({
              retryAfterSeconds: supplierSync.rateLimit.retryAfterSeconds,
              problem: supplierSync.rateLimit.problem,
              timezone: scope.timezone,
              nowMs: Date.now(),
            })
          : supplierSync.error;
        const result: InventorySetupImportResult = {
          suppliers: {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [failureMessage],
          },
          invoices: { synced: 0, parsedFromAttachment: 0, parseFailed: [] },
          rawItems: { upserted: 0, skipped: 0 },
          deliverySuggestions: { suppliersSuggested: 0 },
          error: failureMessage,
        };
        await tracker?.failStep("suppliers", failureMessage);
        await tracker?.fail(failureMessage, result);
        console.info("[inventory-setup] import_completed", result);
        return result;
      }

      // Suppliers we only raise POs to (no bills, e.g. Morabito Fruit & Veg) are
      // skipped by the contact sync. Create them from PO contacts now so they show
      // up in the selection gate alongside the bill suppliers. Non-fatal on failure.
      // Run this BEFORE completing the step so the summary can account for both
      // sources — otherwise the "N new" count looks inconsistent with the larger
      // selection list (which also includes these PO-derived suppliers).
      const poSuppliers = await ensureSuppliersFromPurchaseOrders(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      if (poSuppliers.error) {
        console.warn(
          "[inventory-setup] PO supplier creation skipped",
          poSuppliers.error,
        );
      }

      // Combine both sources (bill contacts + PO-only contacts) into one "new"
      // count so the sidebar matches the supplier list shown in the gate.
      const newSuppliers = supplierSync.created + poSuppliers.created;
      await tracker?.completeStep(
        "suppliers",
        supplierSync.updated > 0
          ? `${newSuppliers} new, ${supplierSync.updated} updated`
          : `${newSuppliers} new`,
      );

      // Phase 2 selection gate: pause RIGHT AFTER suppliers are fetched, before
      // touching invoices, so the user can prune the non-ingredient suppliers
      // first. The scoped invoice sync + parse then runs in a second call
      // (parseSelectedSuppliersForSetup). Non-interactive callers (no jobId)
      // fall through and import everything, as before.
      if (tracker) {
        const selectableRows = await ctx.appDb.rls((tx) =>
          suppliersRepo.listForVenueSelection(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
          }),
        );

        // Pre-classify each supplier from how its Xero bills are coded (Direct
        // Costs → ingredient supplier, overheads → not). Non-fatal: on failure the
        // gate falls back to its old all-pre-ticked behaviour.
        const classification = await classifySuppliersByAccount(ctx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        });
        if (classification.error) {
          console.warn(
            "[inventory-setup] supplier classification skipped",
            classification.error,
          );
        }

        const selectableSuppliers: SelectableSupplier[] = selectableRows
          // Hide placeholder contacts ("No Contact") — they're not a real user
          // decision and get folded into their true supplier by account code
          // during parsing. Showing them invites the user to untick something that
          // would then skip its bills.
          .filter((row) => !isPlaceholderSupplierName(row.name))
          .map((row) => {
            // Names that are never an orderable ingredient supplier (the tax office,
            // payment processors) are pushed to the excluded list regardless of how
            // their bills are coded — the user can still re-tick them in the gate.
            if (isLikelyNonInventorySupplierName(row.name)) {
              return { ...row, suggestedInventory: false, classificationReason: "Looks non-inventory" };
            }
            const suggestion = classification.suggestions.get(row.id);
            return {
              ...row,
              suggestedInventory: suggestion ? suggestion.suggestedInventory : true,
              classificationReason: suggestion ? suggestion.reason : null,
            };
          });
        const gateState: InventorySetupImportGateState = {
          stage: "awaiting_selection",
          suppliers: {
            created: supplierSync.created,
            updated: supplierSync.updated,
            skipped: supplierSync.skipped,
            errors: supplierSync.error ? [supplierSync.error] : [],
          },
          selectableSuppliers,
        };
        await tracker.pauseForSelection(gateState);
        console.info("[inventory-setup] import_paused_for_selection", {
          venueId: scope.venueId,
          jobId: args.jobId,
          supplierCount: selectableSuppliers.length,
        });
        return {
          suppliers: gateState.suppliers,
          invoices: { synced: 0, parsedFromAttachment: 0, parseFailed: [] },
          rawItems: { upserted: 0, skipped: 0 },
          deliverySuggestions: { suppliersSuggested: 0 },
          error: supplierSync.error,
        };
      }

      // Legacy non-interactive path (no jobId → no tracker, no selection gate):
      // sync invoices and parse everything for the venue, as before Phase 2.
      const invoiceSync = await syncVenueXeroInvoices(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        // Only the last 8 weeks of bills — recent invoices are what matter for
        // learning a supplier's items, and it keeps PDF parsing cheap.
        daysBack: args.daysBack ?? 56,
        skipApiLineItems: true,
      });

      const attachmentParse = await parseInvoiceAttachmentsForInventorySetup(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });

      // Non-destructive: aggregation upserts by (supplier + normalized desc +
      // unit) and preserves review/normalisation status + product links, so a
      // re-run merges fresh prices in without wiping the user's work. The wipe
      // lives only behind the explicit restart action (wipeVenueProcurementData).
      const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });

      await propagateReimportInvoicePrices(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });

      const suppliersSuggested = await ctx.appDb.rls((tx) =>
        inferDeliverySchedulesFromInvoices(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        }),
      );

      const result: InventorySetupImportResult = {
        suppliers: {
          created: supplierSync.created,
          updated: supplierSync.updated,
          skipped: supplierSync.skipped,
          errors: supplierSync.error ? [supplierSync.error] : [],
        },
        invoices: {
          synced: invoiceSync.synced,
          parsedFromAttachment: attachmentParse.parsed,
          parseFailed: attachmentParse.failed,
        },
        rawItems,
        deliverySuggestions: { suppliersSuggested },
        error: invoiceSync.error,
      };

      console.info("[inventory-setup] import_completed", result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      await tracker?.fail(message);
      throw error;
    }
  },

  /**
   * Phase 2 second leg: the user has picked which suppliers deliver inventory.
   * Persist the selection, then run the scoped parse → raw items → delivery
   * steps on the job that was parked at the selection gate.
   */
  async parseSelectedSuppliersForSetup(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      jobId: string;
      supplierIds: string[];
      daysBack?: number;
    },
  ): Promise<InventorySetupImportResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const job = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
    if (!job || job.venueId !== scope.venueId) {
      throw new InventorySetupServiceError(404, "Import job not found");
    }
    if (job.status === "completed" && job.result) {
      return job.result as InventorySetupImportResult;
    }
    if (job.status !== "running" || job.currentStepId !== IMPORT_JOB_SELECTION_GATE) {
      throw new InventorySetupServiceError(
        409,
        "Import is not waiting for supplier selection",
      );
    }

    const gateState = (job.result as InventorySetupImportGateState | null) ?? null;

    // Atomically leave the gate so a double-submit can't start parsing twice.
    const claimed = await inventorySetupImportJobRepo.claimGate(ctx.appDb, args.jobId);
    if (!claimed) {
      const refreshed = await inventorySetupImportJobRepo.getById(ctx.appDb, args.jobId);
      if (refreshed?.status === "completed" && refreshed.result) {
        return refreshed.result as InventorySetupImportResult;
      }
      throw new InventorySetupServiceError(409, "Import already in progress");
    }

    // Persist the selection: chosen suppliers become inventory sources, rest don't.
    await ctx.appDb.rls((tx) =>
      suppliersRepo.setInventorySourceForVenue(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        selectedSupplierIds: args.supplierIds,
      }),
    );

    console.info("[inventory-setup] selection_committed", {
      venueId: scope.venueId,
      jobId: args.jobId,
      selectedCount: args.supplierIds.length,
      totalCount: gateState?.selectableSuppliers.length ?? null,
    });

    const tracker = new InventorySetupImportJobTracker(ctx.appDb, args.jobId, job.steps);

    try {
      // Now that we know which suppliers matter, pull their invoice history…
      await tracker.beginStep("invoices");
      const invoiceSync = await syncVenueXeroInvoices(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        // Last 90 days of bills. Every invoice in this window that's mapped to a
        // kept supplier is fully parsed below — so the supplier drawer later shows
        // exactly this synced set, already parsed, with no live re-fetch.
        daysBack: args.daysBack ?? 90,
        skipApiLineItems: true,
      });
      await tracker.completeStep("invoices", `${invoiceSync.synced} invoices synced`);

      // Fold "No Contact"-style orphan bills into their true supplier by account
      // code (a per-supplier purchase account uniquely identifies the supplier),
      // BEFORE parsing — so the reattributed bills are read under the right
      // supplier and the placeholder is archived. Non-fatal.
      try {
        const fold = await foldOrphanBillsByAccount(ctx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        });
        if (fold.error) {
          console.warn("[inventory-setup] orphan bill fold skipped", fold.error);
        }
      } catch (error) {
        console.warn(
          "[inventory-setup] orphan bill fold error",
          error instanceof Error ? error.message : error,
        );
      }

      // …then read only the selected suppliers' PDFs.
      await tracker.beginStep("parse_pdfs");
      const attachmentParse = await parseInvoiceAttachmentsForInventorySetup(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        supplierIds: args.supplierIds,
        onProgress: async (progress) => {
          await tracker.updateStepDetail("parse_pdfs", progress.detail, {
            current: progress.current,
            total: progress.total,
            elapsedMs: progress.elapsedMs,
            recent: progress.recent,
          });
        },
      });
      const parseSummary = `${attachmentParse.parsed} PDFs read`;
      const parseFailures =
        attachmentParse.failed.length > 0
          ? `, ${attachmentParse.failed.length} failed`
          : "";
      await tracker.completeStep("parse_pdfs", `${parseSummary}${parseFailures}`);

      await tracker.beginStep("raw_items");

      // Non-destructive re-import: no clearForVenueScope here. Aggregation upserts
      // by (supplier + normalized desc + unit) and preserves normalisationStatus /
      // reviewedAt / supplierProductId, so re-running merges new invoice lines and
      // refreshes prices without discarding the user's review/normalisation work.
      // The full wipe lives only behind the explicit restart action.
      //
      // Items come ONLY from invoices. A purchase order is the client's request;
      // the supplier sets the real price on the bill, so a PO line is a priceless
      // intent, not a catalog fact — instantiating items from it is unsound. POs
      // are used purely to discover suppliers (ensureSuppliersFromPurchaseOrders),
      // never to populate line items.
      const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });

      // Forward-only price refresh for already-approved products from any newer
      // invoice in this sync. New/unreviewed items are untouched (still queued).
      const repriced = await propagateReimportInvoicePrices(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const repricedSummary =
        repriced.productsRepriced > 0
          ? `, ${repriced.productsRepriced} repriced`
          : "";
      await tracker.completeStep(
        "raw_items",
        `${rawItems.upserted} items added or updated${repricedSummary}`,
      );

      await tracker.beginStep("delivery");
      const suppliersSuggested = await ctx.appDb.rls((tx) =>
        inferDeliverySchedulesFromInvoices(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        }),
      );
      await tracker.completeStep(
        "delivery",
        suppliersSuggested > 0
          ? `${suppliersSuggested} supplier schedule suggestions`
          : "No new suggestions",
      );

      const result: InventorySetupImportResult = {
        suppliers:
          gateState?.suppliers ?? { created: 0, updated: 0, skipped: 0, errors: [] },
        invoices: {
          synced: invoiceSync.synced,
          parsedFromAttachment: attachmentParse.parsed,
          parseFailed: attachmentParse.failed,
        },
        rawItems,
        deliverySuggestions: { suppliersSuggested },
        error: invoiceSync.error,
      };

      await tracker.complete(result);
      console.info("[inventory-setup] import_completed", result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed";
      await tracker.fail(message);
      throw error;
    }
  },

  /**
   * Empty-supplier recovery: re-sync and parse a SINGLE supplier's bills over a
   * wider window (12 months by default) to rescue a kept supplier that produced
   * no items from the standard 90-day import — typically one invoiced less than
   * quarterly. Reuses the normal sync → fold → parse → aggregate → reprice chain,
   * scoped to the one supplier; non-destructive (no clear). If still empty after
   * this, the user's remaining options are a manual PDF upload or the
   * "no catalog yet" ack.
   */
  async retrySupplierCatalogLookback(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      supplierId: string;
      daysBack?: number;
    },
  ): Promise<{ invoicesSynced: number; pdfsParsed: number; rawItemsUpserted: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const invoiceSync = await syncVenueXeroInvoices(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      daysBack: args.daysBack ?? 365,
      skipApiLineItems: true,
    });

    try {
      const fold = await foldOrphanBillsByAccount(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      if (fold.error) {
        console.warn("[inventory-setup] retry fold skipped", fold.error);
      }
    } catch (error) {
      console.warn(
        "[inventory-setup] retry fold error",
        error instanceof Error ? error.message : error,
      );
    }

    const attachmentParse = await parseInvoiceAttachmentsForInventorySetup(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      organisationId: scope.organisationId,
      venueId: scope.venueId,
      supplierIds: [args.supplierId],
    });

    const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    await propagateReimportInvoicePrices(ctx, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    console.info("[inventory-setup] supplier_catalog_retry", {
      venueId: scope.venueId,
      supplierId: args.supplierId,
      daysBack: args.daysBack ?? 365,
      invoicesSynced: invoiceSync.synced,
      pdfsParsed: attachmentParse.parsed,
      rawItemsUpserted: rawItems.upserted,
    });

    return {
      invoicesSynced: invoiceSync.synced,
      pdfsParsed: attachmentParse.parsed,
      rawItemsUpserted: rawItems.upserted,
    };
  },

  async restart(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<InventorySetupRestartResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    console.info("[inventory-setup] restart_started", {
      venueId: scope.venueId,
      userId: ctx.userId,
    });

    const counts = await wipeVenueProcurementData(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    console.info("[inventory-setup] restart_completed", {
      venueId: scope.venueId,
      userId: ctx.userId,
      ...counts,
    });

    return counts;
  },

  async resetNormalisation(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<InventorySetupNormalisationResetResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const counts = await resetVenueNormalisation(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    console.info("[inventory-setup] normalisation_reset", {
      venueId: scope.venueId,
      userId: ctx.userId,
      ...counts,
    });

    return counts;
  },

  async resetProducts(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<InventorySetupProductsResetResult> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const counts = await resetVenueProducts(ctx.appDb, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    // The stage's confirmation acks come back too, so the wizard journey
    // (modifiers check → recipes → confirm) replays from the start.
    await ctx.appDb.rls(async (tx) => {
      const state = await inventorySetupWizardStateRepo.getForVenue(tx, scope.venueId);
      const stamp = { at: new Date().toISOString(), by: ctx.userId };
      let next = applyWizardStatePatch(
        state,
        { setSubStepAck: { key: WIZARD_ACK_KEYS.productsModifiersConfirmed, value: false } },
        stamp,
      );
      next = applyWizardStatePatch(
        next,
        { setSubStepAck: { key: WIZARD_ACK_KEYS.productsConfirmed, value: false } },
        stamp,
      );
      await inventorySetupWizardStateRepo.setForVenue(tx, scope.venueId, next);
    });

    console.info("[inventory-setup] products_reset", {
      venueId: scope.venueId,
      userId: ctx.userId,
      ...counts,
    });

    return counts;
  },
};
