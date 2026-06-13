"use client";

import { useQuery } from "@tanstack/react-query";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import type { PoStatus } from "@/entities/purchase-orders/model/types";

export function usePurchaseOrdersQuery(args: {
  organisation: string;
  venue: string;
  status?: PoStatus | "all";
  search?: string;
  supplierId?: string;
}) {
  const filters = {
    status: args.status ?? "all",
    search: args.search,
    supplierId: args.supplierId,
  };

  return useQuery({
    queryKey: purchaseOrderKeys.list(args.organisation, args.venue, filters),
    queryFn: async () => {
      const result = await purchaseOrdersApi.get.list({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        ...filters,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}

export function usePurchaseOrderDetailQuery(args: {
  organisation: string;
  venue: string;
  poId: string | null;
}) {
  return useQuery({
    queryKey: purchaseOrderKeys.detail(
      args.organisation,
      args.venue,
      args.poId ?? ""
    ),
    enabled: Boolean(args.poId),
    queryFn: async () => {
      const result = await purchaseOrdersApi.get.detail({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        poId: args.poId!,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}
