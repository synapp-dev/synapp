"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  salesInsightsApi,
  type SalesOrdersApiPayload,
} from "@/entities/sales-insights/api/endpoints";
import { salesInsightsKeys } from "@/entities/sales-insights/model/keys";
import type { SalesQueryInput } from "@/entities/sales-insights/model/types";

export function useSalesInsightsQuery({
  organisationSlug,
  venueSlug,
  dateRange,
  enabled = true,
}: SalesQueryInput & { enabled?: boolean }): UseQueryResult<SalesOrdersApiPayload, Error> {
  const startIso = dateRange.start.toISOString();
  const endIso = dateRange.end.toISOString();

  return useQuery<SalesOrdersApiPayload, Error>({
    queryKey: salesInsightsKeys.orders(organisationSlug, venueSlug, startIso, endIso),
    queryFn: async () => {
      return salesInsightsApi.get.orders({
        organisationSlug,
        venueSlug,
        startIso,
        endIso,
      });
    },
    enabled,
  });
}
