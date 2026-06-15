"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useScopedNavigation } from "@/entities/access/scoped-navigation-context";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import { ImportFromXeroProgressDialog } from "@/entities/inventory-setup/components/import-from-xero-progress-dialog";
import {
  isImportJobAwaitingSelection,
  isImportJobInProgress,
} from "@/entities/inventory-setup/lib/import-job-progress";
import {
  clearImportJobDialogDismissed,
  clearPersistedImportJobId,
  isImportJobDialogDismissed,
  markImportJobDialogDismissed,
  persistImportJobId,
  readPersistedImportJobId,
} from "@/entities/inventory-setup/lib/import-job-session";
import type { ImportJobRow } from "@/entities/inventory-setup/model/import-job-types";
import type { InventorySetupImportGateState } from "@/entities/inventory-setup/model/types";

/** A supplier the user just kept, handed to the post-selection review walkthrough. */
export type PendingReviewSupplier = { id: string; name: string };
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { useInventorySetupImportJobSubscription } from "@/entities/inventory-setup/model/useInventorySetupImportJobSubscription";
import { suppliersKeys } from "@/entities/suppliers/model/keys";

/** True once a Xero job step has finished (either completed or skipped). */
function isXeroStepDone(job: ImportJobRow, stepId: string): boolean {
  const step = job.steps.find((s) => s.id === stepId);
  return step?.status === "complete" || step?.status === "skipped";
}

type InventorySetupImportContextValue = {
  activeJob: ImportJobRow | null;
  activeJobId: string | null;
  dialogOpen: boolean;
  isStarting: boolean;
  isImportInProgress: boolean;
  isSubmittingSelection: boolean;
  /** Set once when the user commits their supplier selection; consumed by the review walkthrough. */
  pendingReview: PendingReviewSupplier[] | null;
  clearPendingReview: () => void;
  startImport: () => Promise<void>;
  submitSupplierSelection: (supplierIds: string[]) => Promise<void>;
  openDialog: () => void;
  dismissDialog: () => void;
  finishImport: () => Promise<void>;
};

const InventorySetupImportContext =
  createContext<InventorySetupImportContextValue | null>(null);

export function InventorySetupImportProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { resolvedScope } = useScopedNavigation();
  const organisationSlug = resolvedScope?.organisationSlug ?? null;
  const venueSlug = resolvedScope?.venueSlug ?? null;

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false);
  const [pendingReview, setPendingReview] = useState<PendingReviewSupplier[] | null>(null);
  const autoOpenedForJobRef = useRef<string | null>(null);
  const completionHandledForJobRef = useRef<string | null>(null);
  const suppliersReadyHandledForJobRef = useRef<string | null>(null);

  const activeJob = useInventorySetupImportJobSubscription({
    organisationSlug: organisationSlug ?? "",
    venueSlug: venueSlug ?? "",
    jobId: activeJobId,
    enabled: Boolean(organisationSlug && venueSlug && activeJobId),
  });

  const invalidateAfterImport = useCallback(async () => {
    if (!organisationSlug || !venueSlug) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: suppliersKeys.scope(organisationSlug, venueSlug),
      }),
      queryClient.invalidateQueries({
        queryKey: inventorySetupKeys.progress(organisationSlug, venueSlug),
      }),
    ]);
  }, [organisationSlug, queryClient, venueSlug]);

  const finishImport = useCallback(async () => {
    if (organisationSlug && venueSlug) {
      clearPersistedImportJobId(organisationSlug, venueSlug);
    }
    if (activeJobId) {
      clearImportJobDialogDismissed(activeJobId);
    }
    setDialogOpen(false);
    setActiveJobId(null);
    setIsStarting(false);
    autoOpenedForJobRef.current = null;
    suppliersReadyHandledForJobRef.current = null;
    await invalidateAfterImport();
  }, [activeJobId, invalidateAfterImport, organisationSlug, venueSlug]);

  const hydrateActiveJob = useCallback(async () => {
    if (!organisationSlug || !venueSlug) {
      setActiveJobId(null);
      setDialogOpen(false);
      return;
    }

    const persistedJobId = readPersistedImportJobId(organisationSlug, venueSlug);
    if (persistedJobId) {
      const { data: persistedJob } = await inventorySetupApi.get.importJob({
        organisationSlug,
        venueSlug,
        jobId: persistedJobId,
      });
      if (persistedJob && isImportJobInProgress(persistedJob)) {
        setActiveJobId(persistedJob.id);
        return;
      }
      clearPersistedImportJobId(organisationSlug, venueSlug);
    }

    const { data: activeJobFromServer } = await inventorySetupApi.get.activeImportJob({
      organisationSlug,
      venueSlug,
    });
    if (activeJobFromServer && isImportJobInProgress(activeJobFromServer)) {
      persistImportJobId(organisationSlug, venueSlug, activeJobFromServer.id);
      setActiveJobId(activeJobFromServer.id);
      return;
    }

    setActiveJobId(null);
  }, [organisationSlug, venueSlug]);

  useEffect(() => {
    void hydrateActiveJob();
  }, [hydrateActiveJob]);

  useEffect(() => {
    if (!activeJobId || !activeJob) return;
    if (!isImportJobInProgress(activeJob)) return;
    if (autoOpenedForJobRef.current === activeJobId) return;
    if (isImportJobDialogDismissed(activeJobId)) return;

    setDialogOpen(true);
    autoOpenedForJobRef.current = activeJobId;
  }, [activeJob, activeJobId]);

  useEffect(() => {
    if (!activeJobId || !activeJob) return;
    if (activeJob.status !== "completed" && activeJob.status !== "failed") return;
    if (completionHandledForJobRef.current === activeJobId) return;

    completionHandledForJobRef.current = activeJobId;
    setIsStarting(false);

    void invalidateAfterImport();

    if (activeJob.status === "completed") {
      toast.success("Xero import finished");
    } else if (activeJob.errorMessage) {
      toast.error(activeJob.errorMessage);
    } else {
      toast.error("Xero import failed");
    }
  }, [activeJob, activeJobId, invalidateAfterImport]);

  const startImport = useCallback(async () => {
    if (!organisationSlug || !venueSlug || isStarting || isImportJobInProgress(activeJob)) {
      return;
    }

    setIsStarting(true);
    try {
      const { data: job, error: jobError } = await inventorySetupApi.post.createImportJob({
        organisationSlug,
        venueSlug,
      });
      if (jobError) throw new Error(jobError.message);
      if (!job) throw new Error("Could not start import");

      persistImportJobId(organisationSlug, venueSlug, job.id);
      clearImportJobDialogDismissed(job.id);
      autoOpenedForJobRef.current = null;
      completionHandledForJobRef.current = null;
      suppliersReadyHandledForJobRef.current = null;
      setActiveJobId(job.id);
      setDialogOpen(true);

      const { error } = await inventorySetupApi.post.importFromXero({
        organisationSlug,
        venueSlug,
        jobId: job.id,
      });
      if (error) throw new Error(error.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xero import failed");
      setDialogOpen(false);
      setIsStarting(false);
    }
  }, [activeJob, isStarting, organisationSlug, venueSlug]);

  const openDialog = useCallback(() => {
    if (!activeJobId) return;
    clearImportJobDialogDismissed(activeJobId);
    setDialogOpen(true);
  }, [activeJobId]);

  const dismissDialog = useCallback(() => {
    if (activeJobId && isImportJobInProgress(activeJob)) {
      markImportJobDialogDismissed(activeJobId);
    }
    setDialogOpen(false);
  }, [activeJob, activeJobId]);

  // Once the user has committed their supplier selection, the post-selection
  // phase (invoice sync → PDF parse → …) begins in the background. The supplier
  // rows already exist, so surface them in the table and drop the modal to the
  // header progress pill. We deliberately do NOT drop to the pill while the job
  // is parked at the selection gate — the dialog stays open showing the picker
  // until the user commits their choice.
  useEffect(() => {
    if (!activeJobId || !activeJob) return;
    if (activeJob.jobType !== "xero") return;
    if (!isImportJobInProgress(activeJob)) return;
    if (suppliersReadyHandledForJobRef.current === activeJobId) return;
    if (isImportJobAwaitingSelection(activeJob)) return;

    const invoicesStep = activeJob.steps.find((s) => s.id === "invoices");
    const postSelectionStarted =
      invoicesStep?.status === "running" ||
      invoicesStep?.status === "complete" ||
      invoicesStep?.status === "skipped";
    if (!isXeroStepDone(activeJob, "suppliers") || !postSelectionStarted) {
      return;
    }

    suppliersReadyHandledForJobRef.current = activeJobId;
    void invalidateAfterImport();
    dismissDialog();
  }, [activeJob, activeJobId, dismissDialog, invalidateAfterImport]);

  const submitSupplierSelection = useCallback(
    async (supplierIds: string[]) => {
      if (!organisationSlug || !venueSlug || !activeJobId) return;
      setIsSubmittingSelection(true);
      try {
        const { error } = await inventorySetupApi.post.parseSelectedSuppliers({
          organisationSlug,
          venueSlug,
          jobId: activeJobId,
          supplierIds,
        });
        if (error) throw new Error(error.message);

        // Hand the kept suppliers to the review walkthrough (names from the gate state).
        const gate = activeJob?.result
          ? (activeJob.result as unknown as InventorySetupImportGateState)
          : null;
        const kept = (gate?.selectableSuppliers ?? [])
          .filter((s) => supplierIds.includes(s.id))
          .map((s) => ({ id: s.id, name: s.name }));
        setPendingReview(kept.length > 0 ? kept : null);

        // Suppliers exist already; let parsing run in the background and drop
        // the dialog to the header pill so the user can edit the supplier table.
        await invalidateAfterImport();
        dismissDialog();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not start parsing",
        );
      } finally {
        setIsSubmittingSelection(false);
      }
    },
    [activeJob, activeJobId, dismissDialog, invalidateAfterImport, organisationSlug, venueSlug],
  );

  const clearPendingReview = useCallback(() => setPendingReview(null), []);

  const value = useMemo<InventorySetupImportContextValue>(
    () => ({
      activeJob,
      activeJobId,
      dialogOpen,
      isStarting,
      isImportInProgress: isStarting || isImportJobInProgress(activeJob),
      isSubmittingSelection,
      pendingReview,
      clearPendingReview,
      startImport,
      submitSupplierSelection,
      openDialog,
      dismissDialog,
      finishImport,
    }),
    [
      activeJob,
      activeJobId,
      clearPendingReview,
      pendingReview,
      dialogOpen,
      dismissDialog,
      finishImport,
      isStarting,
      isSubmittingSelection,
      openDialog,
      startImport,
      submitSupplierSelection,
    ],
  );

  return (
    <InventorySetupImportContext.Provider value={value}>
      {children}
      {organisationSlug && venueSlug && activeJobId ? (
        <ImportFromXeroProgressDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (open) {
              openDialog();
              return;
            }
            if (isImportJobInProgress(activeJob)) {
              dismissDialog();
              return;
            }
            void finishImport();
          }}
          job={activeJob}
          onSubmitSelection={submitSupplierSelection}
          isSubmittingSelection={isSubmittingSelection}
          onFinished={() => {
            void finishImport();
          }}
        />
      ) : null}
    </InventorySetupImportContext.Provider>
  );
}

export function useInventorySetupImport(): InventorySetupImportContextValue {
  const ctx = useContext(InventorySetupImportContext);
  if (!ctx) {
    throw new Error(
      "useInventorySetupImport must be used within InventorySetupImportProvider",
    );
  }
  return ctx;
}

export function useOptionalInventorySetupImport(): InventorySetupImportContextValue | null {
  return useContext(InventorySetupImportContext);
}
