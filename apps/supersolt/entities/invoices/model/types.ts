export type InvoiceReviewStatus =
  | "pending_review"
  | "pending_approval"
  | "confirmed"
  | "disputed"
  | "duplicate"
  | "archived";

export type InvoiceSource = "xero" | "upload" | "email";

export type InvoiceDocumentType = "invoice" | "credit_note";

export type ParseConfidence = "high" | "medium" | "low";

export type MatchMethod = "auto" | "manual" | "standalone";

export type DisputeReason =
  | "line_item_mismatch"
  | "price_mismatch"
  | "quantity_mismatch"
  | "wrong_supplier"
  | "other";

export type InvoiceRow = {
  id: string;
  xeroInvoiceId: string | null;
  invoiceNumber: string | null;
  supplierName: string | null;
  supplierId: string | null;
  xeroContactId: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  documentType: InvoiceDocumentType;
  totalCents: number;
  amountDueCents: number | null;
  subtotalCents: number | null;
  gstCents: number | null;
  currencyCode: string;
  xeroStatus: string;
  reviewStatus: InvoiceReviewStatus;
  source: InvoiceSource;
  reference: string | null;
  parseConfidence: ParseConfidence | null;
  matchMethod: MatchMethod | null;
  purchaseOrderId: string | null;
  disputeReason: DisputeReason | null;
  notes: string | null;
  syncedAt: string;
  confirmedAt: string | null;
  createdAt: string;
};

export type InvoiceLineItemRow = {
  id: string;
  parsedDescription: string | null;
  supplierProductId: string | null;
  ingredientId: string | null;
  quantity: number | null;
  unit: string | null;
  unitPriceCents: number | null;
  lineTotalCents: number | null;
  isUnmapped: boolean;
  mappingMethod: "auto" | "manual" | null;
  sortOrder: number;
};

export type InvoiceAttachmentRow = {
  id: string;
  fileName: string;
  mimeType: string | null;
  contentLength: number | null;
  storagePath: string;
  source: string;
};

export type InvoiceAuditEntry = {
  id: string;
  eventType: string;
  beforeValue: unknown;
  afterValue: unknown;
  changedByUserId: string | null;
  changedAt: string;
};

export type InvoicesListMeta = {
  xeroConnected: boolean;
  tenantName: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
  pendingReviewCount: number;
  disputedCount: number;
  duplicateCount: number;
  inboxAddress: string | null;
};

export type InvoicesListPayload = {
  invoices: InvoiceRow[];
  meta: InvoicesListMeta;
};

export type CostChangePreviewLine = {
  lineItemId: string;
  description: string | null;
  supplierProductId: string | null;
  oldPriceCents: number;
  newPriceCents: number;
};

export type CostChangePreview = {
  lines: CostChangePreviewLine[];
  affectedRecipeCount: number;
};

export type AttachmentParseState = {
  status: "cached" | "needed" | "unavailable" | "failed" | "parsing";
  fingerprint: string | null;
  parsedAt: string | null;
  error: string | null;
};

export type InvoiceDetailPayload = {
  invoice: InvoiceRow;
  lineItems: InvoiceLineItemRow[];
  attachments: InvoiceAttachmentRow[];
  auditLog: InvoiceAuditEntry[];
  xeroUrl: string | null;
  xeroAttachments: InvoiceAttachmentRow[];
  attachmentsSource: "local" | "xero" | "none";
  attachmentsError: string | null;
  attachmentParse: AttachmentParseState;
  poNumber: string | null;
  costChangePreview: CostChangePreview | null;
};

export type ConfirmInvoiceInput = {
  propagatePriceChanges?: boolean;
  linePropagation?: Record<string, boolean>;
};

export type ParseTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type ParseAttachmentResult = {
  skipped: boolean;
  parsed: boolean;
  lineItemCount: number;
  fingerprint: string | null;
  error: string | null;
  tokenUsage: ParseTokenUsage | null;
  detail: InvoiceDetailPayload | null;
};

export type BulkApproveResult = {
  approved: string[];
  failed: Array<{ invoiceId: string; reason: string }>;
};
