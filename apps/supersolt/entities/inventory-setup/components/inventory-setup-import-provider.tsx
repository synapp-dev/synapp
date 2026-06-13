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
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { useInventorySetupImportJobSubscription } from "@/entities/inventory-setup/model/useInventorySetupImportJobSubscription";
import { suppliersKeys } from "@/entities/suppliers/model/keys";

type InventorySetupImportContextValue = {
  activeJob: ImportJobRow | null;
  activeJobId: string | null;
  dialogOpen: boolean;
  isStarting: boolean;
  isImportInProgress: boolean;
  startImport: () => Promise<void>;
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
  const autoOpenedForJobRef = useRef<string | null>(null);
  const completionHandledForJobRef = useRef<string | null>(null);

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

  const value = useMemo<InventorySetupImportContextValue>(
    () => ({
      activeJob,
      activeJobId,
      dialogOpen,
      isStarting,
      isImportInProgress: isStarting || isImportJobInProgress(activeJob),
      startImport,
      openDialog,
      dismissDialog,
      finishImport,
    }),
    [
      activeJob,
      activeJobId,
      dialogOpen,
      dismissDialog,
      finishImport,
      isStarting,
      openDialog,
      startImport,
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
