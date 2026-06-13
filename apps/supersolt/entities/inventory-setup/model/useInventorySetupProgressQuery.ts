"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import type { InventorySetupProgress } from "@/entities/inventory-setup/model/types";

export function useInventorySetupProgressQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
}): UseQueryResult<InventorySetupProgress, Error> {
  return useQuery<InventorySetupProgress, Error>({
    queryKey: inventorySetupKeys.progress(input.organisationSlug, input.venueSlug),
    enabled: input.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await inventorySetupApi.get.progress({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Missing inventory setup progress");
      }
      return data;
    },
  });
}
