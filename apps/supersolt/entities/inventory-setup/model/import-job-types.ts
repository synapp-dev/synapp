import type {
  InventorySetupImportResult,
  InvoiceFirstImportResult,
} from "@/entities/inventory-setup/model/types";

import type { SquareCatalogImportResult } from "@/entities/pos-catalog-import/model/types";



export type ImportJobType = "xero" | "square_catalog";



/**
 * Sentinel `currentStepId` for a Xero import paused at the supplier-selection
 * gate (mirrors the server constant of the same name).
 */
export const IMPORT_JOB_SELECTION_GATE = "awaiting_selection";



export type ImportJobStatus = "pending" | "running" | "completed" | "failed";



export type ImportJobStepStatus =

  | "pending"

  | "running"

  | "complete"

  | "failed"

  | "skipped";



export type XeroImportJobStepId =

  | "suppliers"

  | "invoices"

  | "parse_pdfs"

  | "raw_items"

  | "delivery";



export type SquareCatalogImportStepId =

  | "verify_connection"

  | "fetch_catalog"

  | "upsert_menu_items"

  | "summary";



export type ImportJobStepId = XeroImportJobStepId | SquareCatalogImportStepId;



/** One real invoice the parse step just finished, for the live activity feed. */
export type ImportJobInvoiceActivity = {

  /** Stable invoice id — unique render key for the activity feed. */
  id: string;

  supplier: string | null;

  number: string | null;

  amountCents: number | null;

  items: number;

  ok: boolean;

  /**
   * Invoice-first import: how this invoice's supplier was resolved from its
   * header — matched by ABN, matched by name, or minted fresh. Absent on the
   * legacy contact-based flow.
   */
  supplierAction?: "matched_abn" | "matched_name" | "created" | null;

};

/**
 * One diagnostic line in a step's live event log — connection checks, pages
 * fetched, rate-limit hits — newest first, capped (mirrors the server type).
 */
export type ImportJobStepLogEvent = {

  /** ISO timestamp of when the event happened. */
  at: string;

  text: string;

  kind: "info" | "throttle" | "error";

};

export type ImportJobStepProgress = {

  current: number;

  total: number;

  /** Wall-clock ms since the step's work began — lets the UI show an ETA. */
  elapsedMs?: number;

  /** Most-recently completed items, newest first (capped). */
  recent?: ImportJobInvoiceActivity[];

  /**
   * When Xero has throttled us and the whole fleet is paused, the epoch-ms
   * timestamp work resumes at — lets the UI show a live "resuming in 0:42"
   * countdown instead of an unexplained stall. Null/absent when running freely.
   */
  throttledUntilMs?: number | null;

  /** Live diagnostic event log for this step, newest first (capped). */
  events?: ImportJobStepLogEvent[];

};



export type ImportJobStep = {

  id: ImportJobStepId;

  label: string;

  description: string;

  status: ImportJobStepStatus;

  detail?: string | null;

  progress?: ImportJobStepProgress | null;

  summary?: string | null;

};



export type ImportJobResult =
  | InventorySetupImportResult
  | InvoiceFirstImportResult
  | SquareCatalogImportResult
  | null;



export type ImportJobRow = {

  id: string;

  organisationId: string;

  venueId: string;

  createdByUserId: string;

  jobType: ImportJobType;

  status: ImportJobStatus;

  currentStepId: string | null;

  steps: ImportJobStep[];

  result: ImportJobResult;

  errorMessage: string | null;

  startedAt: string | null;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;

};


