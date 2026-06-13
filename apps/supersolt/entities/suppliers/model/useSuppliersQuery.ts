"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import type { SupplierListResponse, SupplierSummary } from "@/entities/suppliers/model/types";

type UseSuppliersQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  archived?: boolean;
  hasProducts?: boolean;
  sort?: "name" | "last_invoice" | "ytd_spend";
  page?: number;
  pageSize?: number;
};

export function useSuppliersQuery(
  input: UseSuppliersQueryInput
): UseQueryResult<SupplierListResponse, Error> {
  return useQuery<SupplierListResponse, Error>({
    queryKey: suppliersKeys.list(input.organisationSlug, input.venueSlug, {
      search: input.search,
      category: input.category,
      status: input.status,
      archived: input.archived,
      hasProducts: input.hasProducts,
      sort: input.sort,
      page: input.page,
      pageSize: input.pageSize,
    }),
    queryFn: async () => {
      const { data, error } = await suppliersApi.get.list(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { suppliers: [] as SupplierSummary[], total: 0 };
    },
  });
}
