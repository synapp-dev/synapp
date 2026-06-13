"use client";

import { useQuery } from "@tanstack/react-query";
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import type { PosCatalogImportListResponse } from "@/entities/pos-catalog-import/model/types";

export function usePosCatalogImportQuery(args: {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
}) {
  return useQuery<PosCatalogImportListResponse, Error>({
    queryKey: posCatalogImportKeys.list(args.organisationSlug, args.venueSlug),
    queryFn: async () => {
      const { data, error } = await posCatalogImportApi.get.list({
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
      });
      if (error) throw new Error(error.message);
      return (
        data ?? {
          rows: [],
          summary: {
            posImportRan: false,
            inUseMenuItemCount: 0,
            mappedInUseCount: 0,
          },
        }
      );
    },
    enabled: args.enabled ?? true,
  });
}
