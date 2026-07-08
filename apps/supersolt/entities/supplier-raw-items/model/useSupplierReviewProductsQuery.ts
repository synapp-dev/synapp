"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supplierRawItemsApi } from "@/entities/supplier-raw-items/api/endpoints";
import { supplierRawItemsKeys } from "@/entities/supplier-raw-items/model/keys";
import type { SupplierReviewProductsResponse } from "@/entities/supplier-raw-items/model/types";

export function useSupplierReviewProductsQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
  enabled?: boolean;
}): UseQueryResult<SupplierReviewProductsResponse, Error> {
  return useQuery<SupplierReviewProductsResponse, Error>({
    queryKey: supplierRawItemsKeys.reviewProducts(
      input.organisationSlug,
      input.venueSlug,
      input.supplierId,
    ),
    enabled: (input.enabled ?? true) && Boolean(input.supplierId),
    queryFn: async () => {
      const { data, error } = await supplierRawItemsApi.get.reviewProducts(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { products: [] };
    },
  });
}
