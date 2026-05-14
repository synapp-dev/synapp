"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Progress } from "@workspace/ui/components/progress";

import {
  cancelUtilityLineupUploadJobAction,
  listUtilityLineupUploadJobsAction,
  retryUtilityLineupUploadJobAction,
  type ListedUtilityUploadJob,
} from "@/entities/utility-lineups/actions/user-upload-job-actions";
import {
  runEnemyPovUploadPipeline,
  runUtilityLineupJobUploadPipeline,
} from "@/entities/utility-lineups/lib/utility-lineup-job-upload-pipeline";
import { useUtilityLineupUploadQueueStore } from "@/entities/utility-lineups/lib/utility-lineup-upload-queue-store";

function statusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "uploading":
      return "Uploading";
    case "finalizing":
      return "Saving";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function UtilityLineupUploadQueueIndicator() {
  const [jobs, setJobs] = React.useState<ListedUtilityUploadJob[]>([]);
  const bumpListVersion = useUtilityLineupUploadQueueStore((s) => s.bumpListVersion);
  const jobProgress = useUtilityLineupUploadQueueStore((s) => s.jobProgress);

  const load = React.useCallback(async () => {
    const j = await listUtilityLineupUploadJobsAction();
    setJobs(j);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, bumpListVersion]);

  React.useEffect(() => {
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  if (!jobs.length) return null;

  const aggregatePct =
    jobs.length === 1 && jobProgress[jobs[0]!.id] != null
      ? jobProgress[jobs[0]!.id]!
      : null;

  async function onDismiss(job: ListedUtilityUploadJob) {
    const r = await cancelUtilityLineupUploadJobAction(job.id);
    if (!r.ok) toast.error(r.message);
    else {
      useUtilityLineupUploadQueueStore.getState().clearPendingFile(job.id);
      useUtilityLineupUploadQueueStore.getState().clearJobProgress(job.id);
      toast.message("Upload dismissed.");
    }
    void load();
    useUtilityLineupUploadQueueStore.getState().notifyJobsMutated();
  }

  async function onRetry(job: ListedUtilityUploadJob) {
    const r = await retryUtilityLineupUploadJobAction(job.id);
    if (!r.ok) {
      toast.error(r.message);
      return;
    }
    const file = useUtilityLineupUploadQueueStore.getState().pendingFiles[job.id];
    if (!file) {
      toast.message(
        "Original video isn’t in memory anymore — open Upload lineup and queue again.",
      );
      void load();
      return;
    }
    const store = useUtilityLineupUploadQueueStore.getState();
    store.setJobProgress(job.id, 0);
    const isEnemyPov = job.kind === "enemy_pov";
    const pipeline = isEnemyPov
      ? runEnemyPovUploadPipeline({
          jobId: job.id,
          file,
          onProgress: (pct) => store.setJobProgress(job.id, pct),
        })
      : runUtilityLineupJobUploadPipeline({
          jobId: job.id,
          file,
          onProgress: (pct) => store.setJobProgress(job.id, pct),
        });
    void pipeline.then((res) => {
      store.clearJobProgress(job.id);
      if (res.ok) {
        store.clearPendingFile(job.id);
        toast.success(
          isEnemyPov ? "Enemy POV uploaded." : "Lineup submitted for review.",
        );
      } else {
        toast.error(res.message);
      }
      void load();
      store.notifyJobsMutated();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative gap-1.5 border-dashed"
          aria-label="Utility lineup uploads"
        >
          {aggregatePct != null && aggregatePct < 100 ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
          ) : null}
          <span className="max-sm:sr-only">Uploads</span>
          <span className="bg-primary text-primary-foreground inline-flex min-w-5 justify-center rounded-full px-1 text-[10px] font-medium leading-5">
            {jobs.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-normal">
          Lineup uploads
          {aggregatePct != null ? (
            <div className="mt-2">
              <Progress value={aggregatePct} className="h-1.5" />
              <p className="text-muted-foreground mt-1 text-xs">{aggregatePct}%</p>
            </div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {jobs.map((job) => {
          const pct = jobProgress[job.id];
          return (
            <div key={job.id} className="border-border space-y-2 border-b px-2 py-2 last:border-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <span className="truncate">{job.mapSlug}</span>
                    {job.kind === "enemy_pov" ? (
                      <span className="bg-muted text-muted-foreground rounded px-1 py-px text-[10px] font-normal uppercase tracking-wide">
                        Enemy POV
                      </span>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {statusLabel(job.status)}
                    {job.errorMessage ? ` — ${job.errorMessage}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {job.status === "failed" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => void onRetry(job)}
                    >
                      Retry
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 px-2 text-xs"
                    onClick={() => void onDismiss(job)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              {pct != null && job.status !== "failed" ? (
                <Progress value={pct} className="h-1" />
              ) : null}
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
