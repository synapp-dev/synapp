import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  BulkApproveResult,
  ConfirmInvoiceInput,
  DisputeReason,
  InvoiceDetailPayload,
  InvoicesListPayload,
  ParseAttachmentResult,
} from "@/entities/invoices/model/types";
import type { XeroInvoicesSyncPayload } from "@/entities/xero/model/invoice-types";

export const invoicesApi = {
  list(input: {
    organisationSlug: string;
    venueSlug: string;
    view?: "pending_review" | "all";
    fromDate?: string;
    toDate?: string;
    status?: string;
    supplierId?: string;
  }): Promise<ApiResult<InvoicesListPayload>> {
    const qs = new URLSearchParams();
    if (input.view) qs.set("view", input.view);
    if (input.fromDate) qs.set("from", input.fromDate);
    if (input.toDate) qs.set("to", input.toDate);
    if (input.status) qs.set("status", input.status);
    if (input.supplierId) qs.set("supplierId", input.supplierId);
    const query = qs.toString();
    const path = `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices`;
    return apiFetch<InvoicesListPayload>(query ? `${path}?${query}` : path);
  },

  getDetail(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}`,
    );
  },

  upload(input: {
    organisationSlug: string;
    venueSlug: string;
    formData: FormData;
  }): Promise<ApiResult<{ invoiceId: string }>> {
    return apiFetch<{ invoiceId: string }>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/upload`,
      { method: "POST", body: input.formData },
    );
  },

  confirm(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    body?: ConfirmInvoiceInput;
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/confirm`,
      { method: "POST", body: JSON.stringify(input.body ?? {}) },
    );
  },

  dispute(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    reason: DisputeReason;
    notes?: string;
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/dispute`,
      { method: "POST", body: JSON.stringify({ reason: input.reason, notes: input.notes }) },
    );
  },

  markDuplicate(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/duplicate`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  linkPo(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    purchaseOrderId: string | null;
    matchMethod: "manual" | "standalone";
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/link-po`,
      {
        method: "POST",
        body: JSON.stringify({
          purchaseOrderId: input.purchaseOrderId,
          matchMethod: input.matchMethod,
        }),
      },
    );
  },

  bulkApprove(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceIds: string[];
  }): Promise<ApiResult<BulkApproveResult>> {
    return apiFetch<BulkApproveResult>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/bulk-approve`,
      { method: "POST", body: JSON.stringify({ invoiceIds: input.invoiceIds }) },
    );
  },

  updateLine(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    lineId: string;
    supplierProductId?: string | null;
    ingredientId?: string | null;
  }): Promise<ApiResult<InvoiceDetailPayload>> {
    return apiFetch<InvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/lines/${encodeURIComponent(input.lineId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          supplierProductId: input.supplierProductId,
          ingredientId: input.ingredientId,
        }),
      },
    );
  },

  syncFromXero(input: {
    organisationSlug: string;
    venueSlug: string;
    daysBack?: number;
  }): Promise<ApiResult<XeroInvoicesSyncPayload>> {
    return apiFetch<XeroInvoicesSyncPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/sync`,
      { method: "POST", body: JSON.stringify({ daysBack: input.daysBack }) },
    );
  },

  attachmentUrl(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    attachmentId: string;
  }): string {
    return `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/attachments/${encodeURIComponent(input.attachmentId)}`;
  },

  parseAttachment(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
    force?: boolean;
  }): Promise<ApiResult<ParseAttachmentResult>> {
    return apiFetch(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/invoices/${encodeURIComponent(input.invoiceId)}/parse-attachment`,
      {
        method: "POST",
        body: JSON.stringify({ force: input.force ?? false }),
      },
    );
  },
};
