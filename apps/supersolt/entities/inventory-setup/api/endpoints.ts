import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { ImportJobRow } from "@/entities/inventory-setup/model/import-job-types";
import type {
  InventorySetupImportResult,
  InventorySetupNormalisationResetResult,
  InventorySetupProductsResetResult,
  InventorySetupProgress,
  InventorySetupRestartResult,
  InventorySetupWizardState,
  WizardStatePatchInput,
} from "@/entities/inventory-setup/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

export type ImportFromXeroAcceptedResponse = {
  accepted: true;
  jobId: string;
  alreadyRunning?: boolean;
  alreadyCompleted?: boolean;
};

export type OrphanMatchSuggestion =
  | { kind: "existing"; supplierId: string; reason: string }
  | { kind: "create"; suggestedName: string | null; reason: string };

export type OrphanBillSupplier = {
  placeholderSupplierId: string;
  placeholderName: string;
  attributableBills: number;
  skippedNoPdfBills: number;
  identity: { name: string | null; abn: string | null; email: string | null };
  suggestion: OrphanMatchSuggestion;
};

export type AttributeOrphanTarget =
  | { kind: "existing"; supplierId: string }
  | { kind: "create"; name: string };

export const inventorySetupApi = {
  get: {
    progress(input: ScopedInput): Promise<ApiResult<InventorySetupProgress>> {
      return apiFetch<InventorySetupProgress>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/progress`,
      );
    },
    importJob(
      input: ScopedInput & { jobId: string },
    ): Promise<ApiResult<ImportJobRow | null>> {
      return apiFetch<ImportJobRow | null>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs/${input.jobId}`,
      );
    },
    activeImportJob(input: ScopedInput): Promise<ApiResult<ImportJobRow | null>> {
      return apiFetch<ImportJobRow | null>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs/active`,
      );
    },
    orphanBills(
      input: ScopedInput,
    ): Promise<ApiResult<{ orphans: OrphanBillSupplier[] }>> {
      return apiFetch<{ orphans: OrphanBillSupplier[] }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/orphan-bills`,
      );
    },
  },
  post: {
    createImportJob(
      input: ScopedInput & { variant?: "invoice_first" },
    ): Promise<ApiResult<ImportJobRow>> {
      return apiFetch<ImportJobRow>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs`,
        {
          method: "POST",
          body: JSON.stringify(input.variant ? { variant: input.variant } : {}),
        },
      );
    },
    importFromXero(
      input: ScopedInput & {
        daysBack?: number;
        jobId?: string;
        variant?: "invoice_first";
      },
    ): Promise<ApiResult<InventorySetupImportResult | ImportFromXeroAcceptedResponse>> {
      return apiFetch<InventorySetupImportResult | ImportFromXeroAcceptedResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-from-xero`,
        {
          method: "POST",
          body: JSON.stringify({
            daysBack: input.daysBack,
            jobId: input.jobId,
            variant: input.variant,
          }),
        },
      );
    },
    // Abort an in-flight import. Everything already read is kept; re-run resumes.
    cancelImportJob(
      input: ScopedInput & { jobId: string },
    ): Promise<ApiResult<{ cancelled: boolean }>> {
      return apiFetch<{ cancelled: boolean }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs/${input.jobId}/cancel`,
        { method: "POST" },
      );
    },
    parseSelectedSuppliers(
      input: ScopedInput & { jobId: string; supplierIds: string[] },
    ): Promise<ApiResult<ImportFromXeroAcceptedResponse>> {
      return apiFetch<ImportFromXeroAcceptedResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/parse-selected`,
        {
          method: "POST",
          body: JSON.stringify({
            jobId: input.jobId,
            supplierIds: input.supplierIds,
          }),
        },
      );
    },
    attributeOrphanBill(
      input: ScopedInput & {
        placeholderSupplierId: string;
        target: AttributeOrphanTarget;
      },
    ): Promise<ApiResult<{ reassignedInvoices: number; supplierId: string }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/orphan-bills/${input.placeholderSupplierId}/attribute`,
        { method: "POST", body: JSON.stringify({ target: input.target }) },
      );
    },
    restart(input: ScopedInput): Promise<ApiResult<InventorySetupRestartResult>> {
      return apiFetch<InventorySetupRestartResult>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/restart`,
        { method: "POST" },
      );
    },
    resetNormalisation(
      input: ScopedInput,
    ): Promise<ApiResult<InventorySetupNormalisationResetResult>> {
      return apiFetch<InventorySetupNormalisationResetResult>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/reset-normalisation`,
        { method: "POST" },
      );
    },
    resetProducts(
      input: ScopedInput,
    ): Promise<ApiResult<InventorySetupProductsResetResult>> {
      return apiFetch<InventorySetupProductsResetResult>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/reset-products`,
        { method: "POST" },
      );
    },
  },
  patch: {
    wizardState(
      input: ScopedInput & { patch: WizardStatePatchInput },
    ): Promise<ApiResult<InventorySetupWizardState>> {
      return apiFetch<InventorySetupWizardState>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/wizard-state`,
        {
          method: "PATCH",
          body: JSON.stringify(input.patch),
        },
      );
    },
  },
};
