"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventorySetupApi } from "@/entities/inventory-setup/api/endpoints";
import type { AttributeOrphanTarget } from "@/entities/inventory-setup/api/endpoints";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { suppliersKeys } from "@/entities/suppliers/model/keys";

type Scope = { organisationSlug: string; venueSlug: string; enabled?: boolean };

export function useOrphanBillsQuery(input: Scope) {
  return useQuery({
    queryKey: inventorySetupKeys.orphanBills(
      input.organisationSlug,
      input.venueSlug,
    ),
    enabled: input.enabled ?? true,
    queryFn: async () => {
      const { data, error } = await inventorySetupApi.get.orphanBills({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
      });
      if (error) throw new Error(error.message);
      return data?.orphans ?? [];
    },
  });
}

export function useAttributeOrphanBillMutation(scope: {
  organisationSlug: string;
  venueSlug: string;
}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      placeholderSupplierId: string;
      target: AttributeOrphanTarget;
    }) => {
      const { data, error } = await inventorySetupApi.post.attributeOrphanBill({
        ...scope,
        ...input,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Failed to attribute bills");
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: inventorySetupKeys.orphanBills(
          scope.organisationSlug,
          scope.venueSlug,
        ),
      });
      await queryClient.invalidateQueries({
        queryKey: suppliersKeys.scope(scope.organisationSlug, scope.venueSlug),
      });
      await queryClient.invalidateQueries({
        queryKey: inventorySetupKeys.progress(
          scope.organisationSlug,
          scope.venueSlug,
        ),
      });
    },
  });
}
