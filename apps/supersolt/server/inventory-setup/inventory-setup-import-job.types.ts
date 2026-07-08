export type ImportJobType = "xero" | "square_catalog";



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



/**
 * Sentinel `currentStepId` marking a Xero import that has finished syncing
 * suppliers + invoices and is paused waiting for the user to choose which
 * suppliers actually deliver inventory (Phase 2 selection gate). The job row
 * stays `status = "running"` while parked here, so the existing CHECK
 * constraint on `status` is untouched.
 */
export const IMPORT_JOB_SELECTION_GATE = "awaiting_selection";



export type SquareCatalogImportStepId =

  | "verify_connection"

  | "fetch_catalog"

  | "upsert_groups"

  | "upsert_menu_items"

  | "upsert_modifiers"

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
 * fetched, rate-limit hits — newest first, capped. This is what lets the user
 * (and us) see exactly what the import is doing while it's doing it.
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



export type SquareCatalogImportResult = {

  menuItems: { created: number; updated: number; skipped: number };

  groups: { upserted: number };

  modifiers: { lists: number; modifiers: number; links: number };

  catalogPages: number;

  variationsSeen: number;

  seenCatalogObjectIds: string[];

  error: string | null;

};



export type ImportJobRow = {

  id: string;

  organisationId: string;

  venueId: string;

  createdByUserId: string;

  jobType: ImportJobType;

  status: ImportJobStatus;

  currentStepId: string | null;

  steps: ImportJobStep[];

  result: Record<string, unknown> | null;

  errorMessage: string | null;

  startedAt: string | null;

  completedAt: string | null;

  createdAt: string;

  updatedAt: string;

};



export const INITIAL_IMPORT_JOB_STEPS: ImportJobStep[] = [

  {

    id: "suppliers",

    label: "Sync suppliers",

    description: "Pulling supplier contacts from your Xero account.",

    status: "pending",

  },

  {

    id: "invoices",

    label: "Sync invoices",

    description: "Downloading invoice history from Xero (headers only).",

    status: "pending",

  },

  {

    id: "parse_pdfs",

    label: "Read invoice PDFs",

    description:

      "Downloading attachments and using AI to extract product lines from each bill.",

    status: "pending",

  },

  {

    id: "raw_items",

    label: "Build raw item catalog",

    description: "Grouping parsed lines into your supplier raw item list.",

    status: "pending",

  },

  {

    id: "delivery",

    label: "Suggest delivery schedules",

    description: "Inferring delivery days from invoice dates.",

    status: "pending",

  },

];



/**
 * Invoice-first import: no contact sync, no supplier-selection gate — suppliers
 * are minted from the invoices themselves (ABN-keyed headers), so the flow is
 * just "get everything, read everything, build the catalog".
 */
export const INITIAL_INVOICE_FIRST_IMPORT_STEPS: ImportJobStep[] = [

  {

    id: "invoices",

    label: "Get your invoices from Xero",

    description: "Collecting every bill from the last 12 months.",

    status: "pending",

  },

  {

    id: "parse_pdfs",

    label: "Read each invoice",

    description:
      "Downloading each PDF and reading the supplier, items and prices straight off the paperwork.",

    status: "pending",

  },

  {

    id: "raw_items",

    label: "Build your item catalog",

    description: "Grouping every product line into a per-supplier item list.",

    status: "pending",

  },

  {

    id: "delivery",

    label: "Work out delivery days",

    description: "Inferring each supplier's delivery rhythm from invoice dates.",

    status: "pending",

  },

];



export const INITIAL_SQUARE_CATALOG_IMPORT_STEPS: ImportJobStep[] = [

  {

    id: "verify_connection",

    label: "Connect to Square",

    description: "Checking your Square connection and venue location.",

    status: "pending",

  },

  {

    id: "fetch_catalog",

    label: "Fetch item library",

    description: "Downloading POS items from your Square catalog.",

    status: "pending",

  },

  {

    id: "upsert_groups",

    label: "Group subcategories",

    description: "Organising Square items into menu subcategories.",

    status: "pending",

  },

  {

    id: "upsert_menu_items",

    label: "Import POS lines",

    description: "Creating or updating menu items in Supersolt.",

    status: "pending",

  },

  {

    id: "upsert_modifiers",

    label: "Import modifiers",

    description: "Importing add-ons and option sets from Square.",

    status: "pending",

  },

  {

    id: "summary",

    label: "Finish",

    description: "Wrapping up the import summary.",

    status: "pending",

  },

];


