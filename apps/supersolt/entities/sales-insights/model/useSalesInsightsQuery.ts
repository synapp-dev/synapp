"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { salesInsightsApi } from "@/entities/sales-insights/api/endpoints";
import { salesInsightsKeys } from "@/entities/sales-insights/model/keys";
import type {
  SalesOrderRow,
  SalesQueryInput,
} from "@/entities/sales-insights/model/types";

export function useSalesInsightsQuery({
  organisationSlug,
  venueSlug,
  dateRange,
}: SalesQueryInput): UseQueryResult<SalesOrderRow[], Error> {
  const startIso = dateRange.start.toISOString();
  const endIso = dateRange.end.toISOString();

  return useQuery<SalesOrderRow[], Error>({
    queryKey: salesInsightsKeys.orders(organisationSlug, venueSlug, startIso, endIso),
    queryFn: async () => {
      return salesInsightsApi.get.orders({
        organisationSlug,
        venueSlug,
        startIso,
        endIso,
      });
    },
  });
}
