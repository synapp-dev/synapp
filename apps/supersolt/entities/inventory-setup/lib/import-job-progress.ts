import {
  IMPORT_JOB_SELECTION_GATE,
  type ImportJobRow,
} from "@/entities/inventory-setup/model/import-job-types";

export function computeImportJobPercent(job: ImportJobRow | null): number {
  if (!job) return 0;
  if (job.status === "completed") return 100;

  const steps = job.steps;
  if (steps.length === 0) return 0;

  const stepWeight = 100 / steps.length;
  let percent = 0;

  for (const step of steps) {
    if (step.status === "complete" || step.status === "skipped") {
      percent += stepWeight;
      continue;
    }

    if (step.status === "running") {
      if (step.progress && step.progress.total > 0) {
        percent += stepWeight * (step.progress.current / step.progress.total);
      } else {
        percent += stepWeight * 0.35;
      }
      break;
    }

    if (step.status === "failed") {
      break;
    }

    break;
  }

  return Math.min(100, Math.round(percent));
}

export function isImportJobInProgress(job: ImportJobRow | null): boolean {
  return job?.status === "pending" || job?.status === "running";
}

/**
 * True when a Xero import has synced suppliers + invoices and is parked waiting
 * for the user to choose which suppliers deliver inventory (Phase 2 gate).
 */
export function isImportJobAwaitingSelection(job: ImportJobRow | null): boolean {
  return (
    job?.status === "running" &&
    job?.currentStepId === IMPORT_JOB_SELECTION_GATE
  );
}
