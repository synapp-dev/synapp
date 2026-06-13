import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  VenueXeroInvoiceAttachmentsPayload,
  VenueXeroInvoiceDetailPayload,
  XeroInvoicesListPayload,
  XeroInvoicesSyncPayload,
  XeroSuppliersSyncPayload,
} from "@/entities/xero/model/invoice-types";

export type VenueXeroConnectionSummaryDto = {
  connected: boolean;
  tenantId: string | null;
  tenantName: string | null;
  updatedAt: string | null;
};

export const xeroApi = {
  getVenueConnection(
    organisationSlug: string,
    venueSlug: string,
  ): Promise<ApiResult<VenueXeroConnectionSummaryDto>> {
    return apiFetch<VenueXeroConnectionSummaryDto>(
      `/organisations/${encodeURIComponent(organisationSlug)}/venues/${encodeURIComponent(venueSlug)}/xero/connection`,
    );
  },

  listInvoices(input: {
    organisationSlug: string;
    venueSlug: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<ApiResult<XeroInvoicesListPayload>> {
    const qs = new URLSearchParams();
    if (input.fromDate) {
      qs.set("from", input.fromDate);
    }
    if (input.toDate) {
      qs.set("to", input.toDate);
    }
    const query = qs.toString();
    const path = `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices`;
    return apiFetch<XeroInvoicesListPayload>(query ? `${path}?${query}` : path);
  },

  syncInvoices(input: {
    organisationSlug: string;
    venueSlug: string;
    daysBack?: number;
  }): Promise<ApiResult<XeroInvoicesSyncPayload>> {
    return apiFetch<XeroInvoicesSyncPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/sync`,
      {
        method: "POST",
        body: JSON.stringify({ daysBack: input.daysBack }),
      },
    );
  },

  syncSuppliers(input: {
    organisationSlug: string;
    venueSlug: string;
  }): Promise<ApiResult<XeroSuppliersSyncPayload>> {
    return apiFetch<XeroSuppliersSyncPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/suppliers/sync`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  getInvoiceDetail(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  }): Promise<ApiResult<VenueXeroInvoiceDetailPayload>> {
    return apiFetch<VenueXeroInvoiceDetailPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/${encodeURIComponent(input.invoiceId)}`,
    );
  },

  listInvoiceAttachments(input: {
    organisationSlug: string;
    venueSlug: string;
    invoiceId: string;
  }): Promise<ApiResult<VenueXeroInvoiceAttachmentsPayload>> {
    return apiFetch<VenueXeroInvoiceAttachmentsPayload>(
      `/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/xero/invoices/${encodeURIComponent(input.invoiceId)}/attachments`,
    );
  },
};
