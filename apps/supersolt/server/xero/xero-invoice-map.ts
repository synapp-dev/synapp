import { parseXeroDate, parseXeroDateOnly } from "@/server/xero/parse-xero-date";

export type XeroReviewStatus =
  | "pending_review"
  | "confirmed"
  | "disputed"
  | "duplicate";

export type XeroDocumentType = "invoice" | "credit_note";

export type XeroApiInvoiceLine = {
  ItemCode?: string;
  Description?: string;
  Quantity?: number;
  UnitAmount?: number;
  LineAmount?: number;
  /** Chart-of-accounts code the bill line is coded to (e.g. a Direct Costs account). */
  AccountCode?: string;
};

export type XeroApiInvoice = {
  InvoiceID?: string;
  InvoiceNumber?: string;
  Type?: string;
  Status?: string;
  Total?: number;
  AmountDue?: number;
  CurrencyCode?: string;
  Date?: string;
  DueDate?: string;
  UpdatedDateUTC?: string;
  Reference?: string;
  Contact?: {
    ContactID?: string;
    Name?: string;
  };
  /** Returned by the Invoices list endpoint — lets the import skip attachment
   * calls entirely for bills that have no files. */
  HasAttachments?: boolean;
  /** Returned inline by the Invoices list endpoint; used for setup classification. */
  LineItems?: XeroApiInvoiceLine[];
};

export type MappedXeroInvoiceUpsert = {
  xero_invoice_id: string;
  invoice_number: string | null;
  supplier_name: string | null;
  xero_contact_id: string | null;
  invoice_date: string | null;
  due_date: string | null;
  document_type: XeroDocumentType;
  total_cents: number;
  amount_due_cents: number | null;
  currency_code: string;
  xero_status: string;
  review_status: XeroReviewStatus;
  reference: string | null;
  xero_updated_at: string | null;
  has_attachments: boolean | null;
};

function dollarsToCents(value: number | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.round(value * 100);
}

export function mapXeroReviewStatus(xeroStatus: string | undefined): XeroReviewStatus {
  void xeroStatus;
  return "pending_review";
}

export function mapXeroDocumentType(
  type: string | undefined,
  totalCents: number,
): XeroDocumentType {
  const t = (type ?? "").trim().toUpperCase();
  if (t.includes("CREDIT") || totalCents < 0) {
    return "credit_note";
  }
  return "invoice";
}

export function mapXeroApiInvoice(inv: XeroApiInvoice): MappedXeroInvoiceUpsert | null {
  const id = inv.InvoiceID?.trim();
  if (!id) {
    return null;
  }

  const type = (inv.Type ?? "").trim().toUpperCase();
  if (type && type !== "ACCPAY" && type !== "ACCPAYCREDIT") {
    return null;
  }

  const totalCents = dollarsToCents(inv.Total);
  if (totalCents == null) {
    return null;
  }

  const amountDueCents = dollarsToCents(inv.AmountDue);
  const currency =
    inv.CurrencyCode?.trim().length ? inv.CurrencyCode.trim().toUpperCase() : "AUD";

  return {
    xero_invoice_id: id,
    invoice_number: inv.InvoiceNumber?.trim() ?? null,
    supplier_name: inv.Contact?.Name?.trim() ?? null,
    xero_contact_id: inv.Contact?.ContactID?.trim() ?? null,
    invoice_date: parseXeroDateOnly(inv.Date),
    due_date: parseXeroDateOnly(inv.DueDate),
    document_type: mapXeroDocumentType(type, totalCents),
    total_cents: totalCents,
    amount_due_cents: amountDueCents,
    currency_code: currency,
    xero_status: (inv.Status ?? "UNKNOWN").trim().toUpperCase(),
    review_status: mapXeroReviewStatus(inv.Status),
    reference: inv.Reference?.trim() ?? null,
    xero_updated_at: parseXeroDate(inv.UpdatedDateUTC),
    has_attachments: typeof inv.HasAttachments === "boolean" ? inv.HasAttachments : null,
  };
}
