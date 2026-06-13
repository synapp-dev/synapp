export type VenueXeroInvoiceReviewStatus =
  | "pending_review"
  | "confirmed"
  | "disputed"
  | "duplicate";

export type VenueXeroInvoiceDocumentType = "invoice" | "credit_note";

export type VenueXeroInvoiceSource = "xero" | "upload" | "email";

export type VenueXeroInvoiceRow = {
  id: string;
  xeroInvoiceId: string;
  invoiceNumber: string | null;
  supplierName: string | null;
  xeroContactId: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  documentType: VenueXeroInvoiceDocumentType;
  totalCents: number;
  amountDueCents: number | null;
  currencyCode: string;
  xeroStatus: string;
  reviewStatus: VenueXeroInvoiceReviewStatus;
  source: VenueXeroInvoiceSource;
  reference: string | null;
  xeroUpdatedAt: string | null;
  syncedAt: string;
};

export type XeroInvoicesListMeta = {
  dataSource: "xero" | "empty";
  xeroConnected: boolean;
  tenantName: string | null;
  lastSyncAt: string | null;
  syncError: string | null;
};

export type XeroInvoicesListPayload = {
  invoices: VenueXeroInvoiceRow[];
  meta: XeroInvoicesListMeta;
};

export type XeroInvoicesSyncPayload = {
  synced: number;
  skipped: number;
  fetchedFromXero: number;
  lastSyncAt: string | null;
  error: string | null;
};

export type XeroSuppliersSyncPayload = {
  created: number;
  updated: number;
  skipped: number;
  linkedInvoices: number;
  fetchedFromXero: number;
  lastSyncAt: string | null;
  error: string | null;
};

export type VenueXeroInvoiceLineItem = {
  description: string | null;
  quantity: number | null;
  unitAmountCents: number | null;
  lineAmountCents: number | null;
  accountCode: string | null;
};

export type VenueXeroInvoiceAttachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  contentLength: number | null;
};

export type VenueXeroInvoiceAttachmentsPayload = {
  attachments: VenueXeroInvoiceAttachment[];
  attachmentsSource: "xero" | "unavailable";
  attachmentsError: string | null;
};

export type VenueXeroInvoiceDetailPayload = {
  invoice: VenueXeroInvoiceRow;
  lineItems: VenueXeroInvoiceLineItem[];
  subTotalCents: number | null;
  totalTaxCents: number | null;
  xeroUrl: string | null;
  lineItemsSource: "xero" | "unavailable";
  lineItemsError: string | null;
  attachments: VenueXeroInvoiceAttachment[];
  attachmentsSource: "xero" | "unavailable";
  attachmentsError: string | null;
};
