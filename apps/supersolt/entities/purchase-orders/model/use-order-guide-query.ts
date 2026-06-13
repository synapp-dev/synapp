"use client";

import { useQuery } from "@tanstack/react-query";
import { purchaseOrdersApi } from "@/entities/purchase-orders/api/endpoints";
import { purchaseOrderKeys } from "@/entities/purchase-orders/model/keys";
import type { OrderGuidePeriodPreset } from "@/entities/purchase-orders/model/types";

export function useOrderGuideQuery(args: {
  organisation: string;
  venue: string;
  period: OrderGuidePeriodPreset;
}) {
  return useQuery({
    queryKey: purchaseOrderKeys.orderGuide(args.organisation, args.venue, args.period),
    queryFn: async () => {
      const result = await purchaseOrdersApi.get.orderGuide({
        organisationSlug: args.organisation,
        venueSlug: args.venue,
        period: args.period,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data!;
    },
  });
}
