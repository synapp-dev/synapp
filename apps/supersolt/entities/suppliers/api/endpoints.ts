import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  SupplierDetail,
  SupplierFieldSuggestions,
  SupplierListResponse,
  UpsertSupplierInput,
} from "@/entities/suppliers/model/types";

type ListSuppliersInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  archived?: boolean;
  hasProducts?: boolean;
  inventorySource?: boolean;
  sort?: "name" | "last_invoice" | "ytd_spend";
  page?: number;
  pageSize?: number;
};

type GetSupplierInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

type UpdateSupplierInput = GetSupplierInput & {
  payload: UpsertSupplierInput;
};

export const suppliersApi = {
  get: {
    list(input: ListSuppliersInput): Promise<ApiResult<SupplierListResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) {
        params.set("search", input.search.trim());
      }
      if (input.category && input.category !== "all") {
        params.set("category", input.category);
      }
      if (input.status && input.status !== "all") {
        params.set("status", input.status);
      }
      if (input.archived) {
        params.set("archived", "true");
      }
      if (input.hasProducts === true) {
        params.set("hasProducts", "true");
      } else if (input.hasProducts === false) {
        params.set("hasProducts", "false");
      }
      if (input.inventorySource === true) {
        params.set("inventorySource", "true");
      } else if (input.inventorySource === false) {
        params.set("inventorySource", "false");
      }
      if (input.sort) {
        params.set("sort", input.sort);
      }
      if (input.page) {
        params.set("page", String(input.page));
      }
      if (input.pageSize) {
        params.set("pageSize", String(input.pageSize));
      }

      const query = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers`;
      return apiFetch<SupplierListResponse>(query ? `${path}?${query}` : path);
    },
    detail(input: GetSupplierInput): Promise<ApiResult<SupplierDetail>> {
      return apiFetch<SupplierDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}`
      );
    },
  },
  post: {
    create(
      organisationSlug: string,
      venueSlug: string,
      payload: UpsertSupplierInput
    ): Promise<ApiResult<SupplierDetail>> {
      return apiFetch<SupplierDetail>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/suppliers`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
    // Park (or un-park) a supplier as "no catalog yet" — the conscious bypass
    // for a kept inventory supplier that can't be priced from invoices yet.
    noCatalogAck(
      input: GetSupplierInput & { acked: boolean },
    ): Promise<ApiResult<SupplierDetail>> {
      return apiFetch<SupplierDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/no-catalog-ack`,
        { method: "POST", body: JSON.stringify({ acked: input.acked }) },
      );
    },
    // Empty-supplier recovery: re-sync + parse a single supplier's bills over a
    // wider window (default 12 months) to rescue one invoiced less than quarterly.
    retryCatalog(
      input: GetSupplierInput & { daysBack?: number },
    ): Promise<
      ApiResult<{
        invoicesSynced: number;
        pdfsParsed: number;
        rawItemsUpserted: number;
      }>
    > {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/suppliers/${input.supplierId}/retry-catalog`,
        {
          method: "POST",
          body: JSON.stringify(
            input.daysBack ? { daysBack: input.daysBack } : {},
          ),
        },
      );
    },
    // Testing convenience: auto-complete the supplier stage for the venue.
    smartFill(
      organisationSlug: string,
      venueSlug: string
    ): Promise<
      ApiResult<{
        suppliersProcessed: number;
        profilesFilled: number;
        deactivated: number;
        productsCreated: number;
        itemsCleared: number;
      }>
    > {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/suppliers/smart-fill`,
        { method: "POST" }
      );
    },
    // Testing convenience: undo Smart Fill for the venue.
    resetApprovals(
      organisationSlug: string,
      venueSlug: string
    ): Promise<
      ApiResult<{
        itemsReset: number;
        productsRemoved: number;
        suppliersReactivated: number;
      }>
    > {
      return apiFetch(
        `/organisations/${organisationSlug}/venues/${venueSlug}/suppliers/reset-approvals`,
        { method: "POST" }
      );
    },
  },
  patch: {
    update(input: UpdateSupplierInput): Promise<ApiResult<SupplierDetail>> {
      return apiFetch<SupplierDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.payload),
        }
      );
    },
    suggestSetupFields(
      input: GetSupplierInput,
    ): Promise<ApiResult<{ suggestions: SupplierFieldSuggestions }>> {
      return apiFetch<{ suggestions: SupplierFieldSuggestions }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/suppliers/${input.supplierId}/suggest`,
        { method: "POST" },
      );
    },
  },
  delete: {
    byId(input: GetSupplierInput): Promise<ApiResult<{ deleted: boolean }>> {
      return apiFetch<{ deleted: boolean }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}`,
        {
          method: "DELETE",
        }
      );
    },
  },
};
