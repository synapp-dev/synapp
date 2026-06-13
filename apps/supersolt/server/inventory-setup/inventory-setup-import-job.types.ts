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



export type SquareCatalogImportStepId =

  | "verify_connection"

  | "fetch_catalog"

  | "upsert_groups"

  | "upsert_menu_items"

  | "upsert_modifiers"

  | "summary";



export type ImportJobStepId = XeroImportJobStepId | SquareCatalogImportStepId;



export type ImportJobStepProgress = {

  current: number;

  total: number;

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


