import type { InventorySetupImportResult } from "@/entities/inventory-setup/model/types";

import type { SquareCatalogImportResult } from "@/entities/pos-catalog-import/model/types";



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

  | "upsert_menu_items"

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



export type ImportJobResult = InventorySetupImportResult | SquareCatalogImportResult | null;



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


