"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { suppliersApi } from "@/entities/suppliers/api/endpoints";
import { suppliersKeys } from "@/entities/suppliers/model/keys";
import type { SupplierDetail } from "@/entities/suppliers/model/types";

type UseSupplierQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  supplierId: string;
};

export function useSupplierQuery(
  input: UseSupplierQueryInput
): UseQueryResult<SupplierDetail, Error> {
  return useQuery<SupplierDetail, Error>({
    queryKey: suppliersKeys.detail(input.organisationSlug, input.venueSlug, input.supplierId),
    queryFn: async () => {
      const { data, error } = await suppliersApi.get.detail({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        supplierId: input.supplierId,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Supplier not found");
      }
      return data;
    },
    enabled: Boolean(input.supplierId),
  });
}
