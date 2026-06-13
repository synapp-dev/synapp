"use client";

import { useEffect, useRef, useState } from "react";

import { createBrowserClient } from "@/utils/supabase/client";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import { isImportJobInProgress } from "@/entities/inventory-setup/lib/import-job-progress";
import type { ImportJobRow } from "@/entities/inventory-setup/model/import-job-types";

function mapRealtimeRow(row: Record<string, unknown>): ImportJobRow {
  return {
    id: String(row.id),
    organisationId: String(row.organisation_id),
    venueId: String(row.venue_id),
    createdByUserId: String(row.created_by_user_id),
    jobType: (row.job_type as ImportJobRow["jobType"]) ?? "xero",
    status: row.status as ImportJobRow["status"],
    currentStepId: row.current_step_id ? String(row.current_step_id) : null,
    steps: (row.steps as ImportJobRow["steps"]) ?? [],
    result: (row.result as ImportJobRow["result"]) ?? null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function useInventorySetupImportJobSubscription(args: {
  organisationSlug: string;
  venueSlug: string;
  jobId: string | null;
  enabled?: boolean;
}) {
  const [job, setJob] = useState<ImportJobRow | null>(null);
  const enabled = Boolean(args.enabled && args.jobId);

  useEffect(() => {
    setJob(null);
  }, [args.jobId]);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!args.jobId || !enabled) {
      return;
    }

    let cancelled = false;

    const fetchJob = async () => {
      const { data } = await inventorySetupApi.get.importJob({
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        jobId: args.jobId!,
      });
      if (!cancelled && data) {
        setJob(data);
      }
      return data ?? null;
    };

    void fetchJob();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`inventory-setup-import-${args.jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inventory_setup_import_jobs",
          filter: `id=eq.${args.jobId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            setJob(mapRealtimeRow(payload.new as Record<string, unknown>));
          }
        },
      )
      .subscribe();

    pollTimerRef.current = setInterval(() => {
      void fetchJob().then((data) => {
        if (!data || !isImportJobInProgress(data)) {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      });
    }, 2000);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [args.jobId, args.organisationSlug, args.venueSlug, enabled]);

  return job;
}
