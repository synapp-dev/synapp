import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  SupplierDetail,
  SupplierListResponse,
  UpsertSupplierInput,
} from "@/entities/suppliers/model/types";

type ListSuppliersInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
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
