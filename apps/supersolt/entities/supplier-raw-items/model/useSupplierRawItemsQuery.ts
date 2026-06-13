"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supplierRawItemsApi } from "@/entities/supplier-raw-items/api/endpoints";
import { supplierRawItemsKeys } from "@/entities/supplier-raw-items/model/keys";
import type { SupplierRawItemListResponse } from "@/entities/supplier-raw-items/model/types";

export function useSupplierRawItemsQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
  search?: string;
  enabled?: boolean;
}): UseQueryResult<SupplierRawItemListResponse, Error> {
  return useQuery<SupplierRawItemListResponse, Error>({
    queryKey: supplierRawItemsKeys.list(
      input.organisationSlug,
      input.venueSlug,
      input.supplierId,
      input.search,
    ),
    enabled: (input.enabled ?? true) && Boolean(input.supplierId),
    queryFn: async () => {
      const { data, error } = await supplierRawItemsApi.get.list(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { items: [] };
    },
  });
}
