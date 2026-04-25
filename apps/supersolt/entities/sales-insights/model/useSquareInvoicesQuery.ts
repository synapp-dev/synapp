"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { salesInsightsApi } from "@/entities/sales-insights/api/endpoints";
import { salesInsightsKeys } from "@/entities/sales-insights/model/keys";
import type { SalesQueryInput, SquareInvoicesApiPayload } from "@/entities/sales-insights/model/types";

export function useSquareInvoicesQuery({
  organisationSlug,
  venueSlug,
  dateRange,
}: SalesQueryInput): UseQueryResult<SquareInvoicesApiPayload, Error> {
  const startIso = dateRange.start.toISOString();
  const endIso = dateRange.end.toISOString();

  return useQuery<SquareInvoicesApiPayload, Error>({
    queryKey: salesInsightsKeys.squareInvoices(organisationSlug, venueSlug, startIso, endIso),
    queryFn: async () => {
      return salesInsightsApi.get.squareInvoices({
        organisationSlug,
        venueSlug,
        startIso,
        endIso,
      });
    },
  });
}
