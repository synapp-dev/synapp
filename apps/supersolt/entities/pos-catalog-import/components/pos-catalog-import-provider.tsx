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
import { ImportFromXeroProgressDialog } from "@/entities/inventory-setup/components/import-from-xero-progress-dialog";
import { isImportJobInProgress } from "@/entities/inventory-setup/lib/import-job-progress";
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
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { squareKeys } from "@/entities/square/model/keys";

type PosCatalogImportContextValue = {
  activeJob: ImportJobRow | null;
  isStarting: boolean;
  isImportInProgress: boolean;
  startImport: () => Promise<void>;
  finishImport: () => Promise<void>;
};

const PosCatalogImportContext = createContext<PosCatalogImportContextValue | null>(null);

export function PosCatalogImportProvider({ children }: { children: ReactNode }) {
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
        queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
      }),
      queryClient.invalidateQueries({
        queryKey: inventorySetupKeys.progress(organisationSlug, venueSlug),
      }),
      queryClient.invalidateQueries({
        queryKey: squareKeys.venueConnection(organisationSlug, venueSlug),
      }),
    ]);
  }, [organisationSlug, queryClient, venueSlug]);

  const finishImport = useCallback(async () => {
    if (organisationSlug && venueSlug) {
      clearPersistedImportJobId(organisationSlug, venueSlug, "square_catalog");
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
      return;
    }

    const persistedJobId = readPersistedImportJobId(
      organisationSlug,
      venueSlug,
      "square_catalog",
    );
    if (persistedJobId) {
      const { data: persistedJob } = await posCatalogImportApi.get.importJob({
        organisationSlug,
        venueSlug,
        jobId: persistedJobId,
      });
      if (persistedJob && isImportJobInProgress(persistedJob)) {
        setActiveJobId(persistedJob.id);
        return;
      }
      clearPersistedImportJobId(organisationSlug, venueSlug, "square_catalog");
    }

    const { data: activeJobFromServer } = await posCatalogImportApi.get.activeImportJob({
      organisationSlug,
      venueSlug,
    });
    if (activeJobFromServer && isImportJobInProgress(activeJobFromServer)) {
      persistImportJobId(organisationSlug, venueSlug, activeJobFromServer.id, "square_catalog");
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
      toast.success("Square import finished");
    } else if (activeJob.errorMessage) {
      toast.error(activeJob.errorMessage);
    } else {
      toast.error("Square import failed");
    }
  }, [activeJob, activeJobId, invalidateAfterImport]);

  const startImport = useCallback(async () => {
    if (!organisationSlug || !venueSlug || isStarting || isImportJobInProgress(activeJob)) {
      return;
    }

    setIsStarting(true);
    try {
      const { data: job, error: jobError } = await posCatalogImportApi.post.createImportJob({
        organisationSlug,
        venueSlug,
      });
      if (jobError) throw new Error(jobError.message);
      if (!job) throw new Error("Could not start import");

      persistImportJobId(organisationSlug, venueSlug, job.id, "square_catalog");
      clearImportJobDialogDismissed(job.id);
      autoOpenedForJobRef.current = null;
      completionHandledForJobRef.current = null;
      setActiveJobId(job.id);
      setDialogOpen(true);

      const { error } = await posCatalogImportApi.post.importFromSquare({
        organisationSlug,
        venueSlug,
        jobId: job.id,
      });
      if (error) throw new Error(error.message);
      setIsStarting(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Square import failed");
      setDialogOpen(false);
      setIsStarting(false);
    }
  }, [activeJob, isStarting, organisationSlug, venueSlug]);

  const value = useMemo<PosCatalogImportContextValue>(
    () => ({
      activeJob,
      isStarting,
      isImportInProgress: isStarting || isImportJobInProgress(activeJob),
      startImport,
      finishImport,
    }),
    [activeJob, finishImport, isStarting, startImport],
  );

  return (
    <PosCatalogImportContext.Provider value={value}>
      {children}
      {organisationSlug && venueSlug && activeJobId ? (
        <ImportFromXeroProgressDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              if (isImportJobInProgress(activeJob)) {
                markImportJobDialogDismissed(activeJobId);
              }
              setDialogOpen(false);
              if (activeJob?.status === "completed" || activeJob?.status === "failed") {
                void finishImport();
              }
              return;
            }
            setDialogOpen(true);
          }}
          job={activeJob}
          variant="square_catalog"
          onFinished={() => {
            void finishImport();
          }}
        />
      ) : null}
    </PosCatalogImportContext.Provider>
  );
}

export function usePosCatalogImport(): PosCatalogImportContextValue {
  const ctx = useContext(PosCatalogImportContext);
  if (!ctx) {
    throw new Error("usePosCatalogImport must be used within PosCatalogImportProvider");
  }
  return ctx;
}
