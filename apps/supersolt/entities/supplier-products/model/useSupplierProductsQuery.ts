"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supplierProductsApi } from "@/entities/supplier-products/api/endpoints";
import { supplierProductKeys } from "@/entities/supplier-products/model/keys";
import type { SupplierProductListResponse } from "@/entities/supplier-products/model/types";

type UseSupplierProductsQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
  search?: string;
};

export function useSupplierProductsQuery(
  input: UseSupplierProductsQueryInput,
): UseQueryResult<SupplierProductListResponse, Error> {
  return useQuery({
    queryKey: supplierProductKeys.bySupplier(
      input.organisationSlug,
      input.venueSlug,
      input.supplierId,
    ),
    queryFn: async () => {
      const { data, error } = await supplierProductsApi.get.list(input);
      if (error) throw new Error(error.message);
      return data ?? { products: [] };
    },
    enabled: Boolean(input.supplierId),
  });
}
