import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  ApproveSupplierAsProductsInput,
  ApproveSupplierAsProductsResult,
  ApproveSupplierRawItemsInput,
  ConfirmSupplierItemsTriageInput,
  ConfirmSupplierItemsTriageResult,
  CreateSupplierRawItemInput,
  SkipSupplierItemsInput,
  SupplierRawItemListResponse,
  SupplierRawItemSourcesResponse,
  SupplierRawItemSummary,
  SupplierReviewProductsResponse,
  UpdateSupplierRawItemInput,
} from "@/entities/supplier-raw-items/model/types";

type ScopedSupplierInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

export const supplierRawItemsApi = {
  get: {
    list(
      input: ScopedSupplierInput & { search?: string },
    ): Promise<ApiResult<SupplierRawItemListResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) params.set("search", input.search.trim());
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-items`;
      return apiFetch<SupplierRawItemListResponse>(qs ? `${path}?${qs}` : path);
    },
    sources(
      input: ScopedSupplierInput,
    ): Promise<ApiResult<SupplierRawItemSourcesResponse>> {
      return apiFetch<SupplierRawItemSourcesResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-item-sources`,
      );
    },
    reviewProducts(
      input: ScopedSupplierInput,
    ): Promise<ApiResult<SupplierReviewProductsResponse>> {
      return apiFetch<SupplierReviewProductsResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/review-products`,
      );
    },
  },
  post: {
    create(
      input: ScopedSupplierInput & { payload: CreateSupplierRawItemInput },
    ): Promise<ApiResult<SupplierRawItemSummary>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-items`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
    approveMany(
      input: ScopedSupplierInput & { payload: ApproveSupplierRawItemsInput },
    ): Promise<ApiResult<{ updated: number }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-items/approve`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
    approveAsProducts(
      input: ScopedSupplierInput & { payload: ApproveSupplierAsProductsInput },
    ): Promise<ApiResult<ApproveSupplierAsProductsResult>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/review-products`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
    skipNotInventory(
      input: ScopedSupplierInput & { payload: SkipSupplierItemsInput },
    ): Promise<ApiResult<{ updated: number }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/review-products/skip`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
    confirmItemsTriage(
      input: ScopedSupplierInput & { payload: ConfirmSupplierItemsTriageInput },
    ): Promise<ApiResult<ConfirmSupplierItemsTriageResult>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/items-triage`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
  },
  patch: {
    update(
      input: ScopedSupplierInput & {
        rawItemId: string;
        payload: UpdateSupplierRawItemInput;
      },
    ): Promise<ApiResult<SupplierRawItemSummary>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-items/${input.rawItemId}`,
        { method: "PATCH", body: JSON.stringify(input.payload) },
      );
    },
  },
  delete: {
    archive(
      input: ScopedSupplierInput & { rawItemId: string },
    ): Promise<ApiResult<{ archived: boolean }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/raw-items/${input.rawItemId}`,
        { method: "DELETE" },
      );
    },
  },
};
