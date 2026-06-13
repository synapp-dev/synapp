import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { ImportJobRow } from "@/entities/inventory-setup/model/import-job-types";
import type {
  InventorySetupImportResult,
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
  },
  post: {
    createImportJob(input: ScopedInput): Promise<ApiResult<ImportJobRow>> {
      return apiFetch<ImportJobRow>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs`,
        { method: "POST" },
      );
    },
    importFromXero(
      input: ScopedInput & { daysBack?: number; jobId?: string },
    ): Promise<ApiResult<InventorySetupImportResult | ImportFromXeroAcceptedResponse>> {
      return apiFetch<InventorySetupImportResult | ImportFromXeroAcceptedResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-from-xero`,
        {
          method: "POST",
          body: JSON.stringify({ daysBack: input.daysBack, jobId: input.jobId }),
        },
      );
    },
    restart(input: ScopedInput): Promise<ApiResult<InventorySetupRestartResult>> {
      return apiFetch<InventorySetupRestartResult>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/restart`,
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
