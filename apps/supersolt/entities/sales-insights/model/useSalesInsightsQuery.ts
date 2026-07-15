"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
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
    // The mirror is refreshed by a 10-minute cron; poll so new payments show
    // up without a manual refresh (pauses while the tab is in the background).
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    // Keep the previous range's rows on screen while a new range loads.
    placeholderData: keepPreviousData,
  });
}
