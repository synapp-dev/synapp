import type { ImportJobType } from "@/entities/inventory-setup/model/import-job-types";

const ACTIVE_JOB_KEY_PREFIX = "inventory-setup-import";
const DISMISSED_JOB_KEY_PREFIX = "inventory-setup-import-dismissed";

function activeJobKey(
  organisationSlug: string,
  venueSlug: string,
  jobType: ImportJobType = "xero",
): string {
  return `${ACTIVE_JOB_KEY_PREFIX}:${jobType}:${organisationSlug}:${venueSlug}`;
}

function dismissedJobKey(jobId: string): string {
  return `${DISMISSED_JOB_KEY_PREFIX}:${jobId}`;
}

export function readPersistedImportJobId(
  organisationSlug: string,
  venueSlug: string,
  jobType: ImportJobType = "xero",
): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(activeJobKey(organisationSlug, venueSlug, jobType));
}

export function persistImportJobId(
  organisationSlug: string,
  venueSlug: string,
  jobId: string,
  jobType: ImportJobType = "xero",
): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(activeJobKey(organisationSlug, venueSlug, jobType), jobId);
}

export function clearPersistedImportJobId(
  organisationSlug: string,
  venueSlug: string,
  jobType: ImportJobType = "xero",
): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(activeJobKey(organisationSlug, venueSlug, jobType));
}

export function isImportJobDialogDismissed(jobId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(dismissedJobKey(jobId)) === "1";
}

export function markImportJobDialogDismissed(jobId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(dismissedJobKey(jobId), "1");
}

export function clearImportJobDialogDismissed(jobId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(dismissedJobKey(jobId));
}
