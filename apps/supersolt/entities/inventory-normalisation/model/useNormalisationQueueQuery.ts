"use client";

import { useQuery } from "@tanstack/react-query";
import { inventoryNormalisationApi } from "@/entities/inventory-normalisation/api/endpoints";
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { attachSimilarPendingItems } from "@/server/inventory-normalisation/find-similar-pending-raw-items";

export function useNormalisationQueueQuery(args: {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: inventoryNormalisationKeys.queue(
      args.organisationSlug,
      args.venueSlug,
      args.search,
    ),
    queryFn: async () => {
      const { data, error } = await inventoryNormalisationApi.get.queue({
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        search: args.search,
      });
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Queue data unavailable");

      return {
        ...data,
        items: attachSimilarPendingItems(data.items),
      };
    },
    enabled: args.enabled ?? true,
  });
}
