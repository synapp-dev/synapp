import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  SupplierProductDetail,
  SupplierProductListResponse,
  SupplierProductSummary,
  UpsertSupplierProductInput,
} from "@/entities/supplier-products/model/types";

type ScopedSupplierInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

export const supplierProductsApi = {
  get: {
    list(
      input: ScopedSupplierInput & { search?: string },
    ): Promise<ApiResult<SupplierProductListResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) params.set("search", input.search.trim());
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products`;
      return apiFetch<SupplierProductListResponse>(qs ? `${path}?${qs}` : path);
    },
    detail(
      input: ScopedSupplierInput & { productId: string },
    ): Promise<ApiResult<SupplierProductDetail>> {
      return apiFetch<SupplierProductDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products/${input.productId}`,
      );
    },
  },
  post: {
    create(
      input: ScopedSupplierInput & { payload: UpsertSupplierProductInput },
    ): Promise<ApiResult<SupplierProductSummary>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products`,
        { method: "POST", body: JSON.stringify(input.payload) },
      );
    },
    makeActive(
      input: ScopedSupplierInput & {
        productId: string;
        propagateCost?: boolean;
      },
    ): Promise<ApiResult<SupplierProductSummary>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products/${input.productId}/make-active`,
        {
          method: "POST",
          body: JSON.stringify({ propagateCost: input.propagateCost }),
        },
      );
    },
  },
  patch: {
    update(
      input: ScopedSupplierInput & {
        productId: string;
        payload: UpsertSupplierProductInput;
      },
    ): Promise<ApiResult<SupplierProductDetail>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products/${input.productId}`,
        { method: "PATCH", body: JSON.stringify(input.payload) },
      );
    },
  },
  delete: {
    archive(
      input: ScopedSupplierInput & { productId: string },
    ): Promise<ApiResult<{ archived: boolean }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/suppliers/${input.supplierId}/products/${input.productId}`,
        { method: "DELETE" },
      );
    },
  },
};
