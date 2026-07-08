"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@workspace/ui/components/button";

import { ImportProgressView } from "@/entities/inventory-setup/components/import-progress-view";
import { useInventorySetupImport } from "@/entities/inventory-setup/components/inventory-setup-import-provider";
import { markSupplierSetupComplete } from "@/entities/inventory-setup/lib/supplier-setup-handoff";

/**
 * Dedicated full-page Xero import. Kicks off the import on mount, shows live
 * progress + the inline supplier-selection gate, and routes back to the suppliers
 * list once the job finishes. The global progress dialog is suppressed on this
 * route by the import provider so this page owns the UI.
 */
export function XeroImportPageClient({
  organisation,
  venue,
}: {
  organisation: string;
  venue: string;
}) {
  const router = useRouter();
  const {
    activeJob,
    isImportInProgress,
    startImport,
    submitSupplierSelection,
    isSubmittingSelection,
    finishImport,
    cancelImport,
    isCancelling,
  } = useInventorySetupImport();

  const suppliersHref = `/${organisation}/${venue}/settings/inventory-setup/suppliers`;
  const attemptingRef = useRef(false);
  const finishedRef = useRef(false);

  // Kick off the import. startImport() is a no-op until the provider's venue scope
  // resolves (its identity changes when it does), so keep attempting until a job is
  // actually in progress — otherwise we'd latch on the first no-op and hang on
  // "Starting import…". attemptingRef prevents overlapping calls within one attempt.
  useEffect(() => {
    // Once the job has finished we navigate away — never re-kick a new import,
    // otherwise clearing the completed job (activeJob → null) immediately
    // re-triggers this effect and starts the whole import over again.
    if (finishedRef.current) return;
    if (isImportInProgress || activeJob) return;
    if (attemptingRef.current) return;
    attemptingRef.current = true;
    void Promise.resolve(startImport()).finally(() => {
      attemptingRef.current = false;
    });
  }, [isImportInProgress, activeJob, startImport]);

  const status = activeJob?.status;

  // On success, let the "All done!" beat land, then clear the job and glide over
  // to the (now-populated) suppliers list. The handoff flag tells that page to
  // offer the guided supplier walkthrough once its table has loaded.
  useEffect(() => {
    if (status !== "completed" || finishedRef.current) return;
    finishedRef.current = true;
    const id = window.setTimeout(() => {
      markSupplierSetupComplete();
      void finishImport().then(() => router.push(suppliersHref));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [status, finishImport, router, suppliersHref]);

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      {activeJob ? (
        <ImportProgressView
          job={activeJob}
          onSubmitSelection={submitSupplierSelection}
          isSubmittingSelection={isSubmittingSelection}
        />
      ) : (
        <p className="text-muted-foreground text-sm">Starting import…</p>
      )}

      {status === "running" || status === "pending" ? (
        <div className="mt-6">
          <Button
            variant="outline"
            className="text-muted-foreground hover:text-destructive"
            disabled={isCancelling}
            onClick={() => void cancelImport()}
          >
            {isCancelling ? "Cancelling…" : "Cancel import"}
          </Button>
          <p className="text-muted-foreground mt-2 text-xs">
            Everything already read is kept — running the import again picks up
            right where it left off.
          </p>
        </div>
      ) : null}

      {status === "failed" ? (
        <div className="mt-6 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // Clear the finished/failed job from state, then explicitly kick off
              // a fresh import job. Relying on the auto-start effect alone left the
              // old failed job on screen (its cached error) without ever re-running.
              attemptingRef.current = false;
              void finishImport().then(() => startImport());
            }}
          >
            Try again
          </Button>
          <Button variant="ghost" onClick={() => router.push(suppliersHref)}>
            Back to suppliers
          </Button>
        </div>
      ) : null}

      {status === "completed" ? (
        <div className="mt-6">
          <Button onClick={() => router.push(suppliersHref)}>View suppliers</Button>
        </div>
      ) : null}
    </div>
  );
}
