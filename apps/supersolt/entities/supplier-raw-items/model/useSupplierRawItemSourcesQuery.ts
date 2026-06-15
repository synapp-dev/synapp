"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supplierRawItemsApi } from "@/entities/supplier-raw-items/api/endpoints";
import { supplierRawItemsKeys } from "@/entities/supplier-raw-items/model/keys";
import type { SupplierRawItemSourcesResponse } from "@/entities/supplier-raw-items/model/types";

export function useSupplierRawItemSourcesQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
  enabled?: boolean;
}): UseQueryResult<SupplierRawItemSourcesResponse, Error> {
  return useQuery<SupplierRawItemSourcesResponse, Error>({
    queryKey: supplierRawItemsKeys.sources(
      input.organisationSlug,
      input.venueSlug,
      input.supplierId,
    ),
    enabled: (input.enabled ?? true) && Boolean(input.supplierId),
    queryFn: async () => {
      const { data, error } = await supplierRawItemsApi.get.sources(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { sources: {} };
    },
  });
}
