import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import {
  evaluateInventorySetupProgress,
  type InventorySetupProgress,
} from "@/server/inventory-setup/inventory-setup-progress";
import {
  buildWizardModel,
  type InventorySetupWizardModel,
} from "@/server/inventory-setup/wizard-model";
import { inventorySetupWizardStateRepo } from "@/server/inventory-setup/inventory-setup-wizard-state.repo";
import { storageLocationsRepo } from "@/server/stock-counts/storage-locations.repo";
import { inferDeliverySchedulesFromInvoices } from "@/server/inventory-setup/infer-delivery-schedule";
import { parseInvoiceAttachmentsForInventorySetup } from "@/server/inventory-setup/parse-invoice-attachments-for-setup";
import {
  IMPORT_JOB_SELECTION_GATE,
  INITIAL_IMPORT_JOB_STEPS,
  type ImportJobRow,
} from "@/server/inventory-setup/inventory-setup-import-job.types";
import { inventorySetupImportJobRepo } from "@/server/inventory-setup/inventory-setup-import-job.repo";
import { InventorySetupImportJobTracker } from "@/server/inventory-setup/inventory-setup-import-job.tracker";
import { wipeVenueProcurementData } from "@/server/inventory-setup/inventory-setup-restart.repo";
import { aggregateInvoiceLinesToRawCatalogForVenue } from "@/server/supplier-raw-items/aggregate-invoice-lines";
import { supplierRawItemsRepo } from "@/server/supplier-raw-items/supplier-raw-items.repo";
import { suppliersRepo } from "@/server/suppliers/suppliers.repo";
import { posCatalogImportRepo } from "@/server/pos-catalog-import/pos-catalog-import.repo";
import { readinessRepo } from "@/server/readiness/readiness.repo";
import { syncVenueXeroSuppliers } from "@/server/xero/xero-suppliers.service";
import { syncVenueXeroInvoices } from "@/server/xero/xero-invoices.service";

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

export type InventorySetupProgressResponse = InventorySetupProgress & {
  wizard: InventorySetupWizardModel;
};

/** Supplier shown in the selection gate's picker. */
export type SelectableSupplier = {
  id: string;
  name: string;
  isInventorySource: boolean;
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
    args: { organisationSlug: string; venueSlug: string },
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
      steps: structuredClone(INITIAL_IMPORT_JOB_STEPS),
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
        const result: InventorySetupImportResult = {
          suppliers: {
            created: 0,
            updated: 0,
            skipped: 0,
            errors: supplierSync.error ? [supplierSync.error] : [],
          },
          invoices: { synced: 0, parsedFromAttachment: 0, parseFailed: [] },
          rawItems: { upserted: 0, skipped: 0 },
          deliverySuggestions: { suppliersSuggested: 0 },
          error: supplierSync.error,
        };
        await tracker?.failStep("suppliers", supplierSync.error);
        await tracker?.fail(supplierSync.error, result);
        console.info("[inventory-setup] import_completed", result);
        return result;
      }

      await tracker?.completeStep(
        "suppliers",
        `${supplierSync.created} new, ${supplierSync.updated} updated`,
      );

      // Phase 2 selection gate: pause RIGHT AFTER suppliers are fetched, before
      // touching invoices, so the user can prune the non-ingredient suppliers
      // first. The scoped invoice sync + parse then runs in a second call
      // (parseSelectedSuppliersForSetup). Non-interactive callers (no jobId)
      // fall through and import everything, as before.
      if (tracker) {
        const selectableSuppliers = await ctx.appDb.rls((tx) =>
          suppliersRepo.listForVenueSelection(tx, {
            organisationId: scope.organisationId,
            venueId: scope.venueId,
          }),
        );
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

      await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.clearForVenueScope(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        }),
      );

      const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
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
        // Only the last 8 weeks of bills — recent invoices are what matter for
        // learning a supplier's items, and it keeps PDF parsing cheap.
        daysBack: args.daysBack ?? 56,
        skipApiLineItems: true,
      });
      await tracker.completeStep("invoices", `${invoiceSync.synced} invoices synced`);

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
      await ctx.appDb.rls((tx) =>
        supplierRawItemsRepo.clearForVenueScope(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
        }),
      );
      const rawItems = await aggregateInvoiceLinesToRawCatalogForVenue(ctx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      await tracker.completeStep("raw_items", `${rawItems.upserted} items added or updated`);

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
};
