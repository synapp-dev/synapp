"use client";

import {
  keepPreviousData,
  useQuery,
  type UseQueryResult,
} from "@tanstack/react-query";
import { salesInsightsKeys } from "@/entities/sales-insights/model/keys";
import type { SalesIntelligencePayload } from "@/entities/sales-insights/model/intelligence-types";
import type { SalesQueryInput } from "@/entities/sales-insights/model/types";

export type SalesIntelligenceScope = "full" | "menu" | "patterns";

async function fetchSalesIntelligence(input: {
  organisationSlug: string;
  venueSlug: string;
  startIso: string;
  endIso: string;
  scope: SalesIntelligenceScope;
}): Promise<SalesIntelligencePayload> {
  const path = `/api/organisations/${encodeURIComponent(input.organisationSlug)}/venues/${encodeURIComponent(input.venueSlug)}/insights/sales-intelligence`;
  const qs = new URLSearchParams({
    start: input.startIso,
    end: input.endIso,
    scope: input.scope,
  });
  const res = await fetch(`${path}?${qs.toString()}`, {
    method: "GET",
    credentials: "include",
  });

  const json = (await res.json()) as {
    data: SalesIntelligencePayload | null;
    error: { message: string; status: number } | null;
  };

  if (!res.ok || json.error || !json.data) {
    throw new Error(
      json.error?.message ?? `Sales intelligence request failed (${res.status})`,
    );
  }

  return json.data;
}

export function useSalesIntelligenceQuery({
  organisationSlug,
  venueSlug,
  dateRange,
  scope = "full",
  enabled = true,
}: SalesQueryInput & {
  scope?: SalesIntelligenceScope;
  enabled?: boolean;
}): UseQueryResult<SalesIntelligencePayload, Error> {
  const startIso = dateRange.start.toISOString();
  const endIso = dateRange.end.toISOString();

  return useQuery<SalesIntelligencePayload, Error>({
    queryKey: salesInsightsKeys.intelligence(
      organisationSlug,
      venueSlug,
      startIso,
      endIso,
      scope,
    ),
    queryFn: () =>
      fetchSalesIntelligence({
        organisationSlug,
        venueSlug,
        startIso,
        endIso,
        scope,
      }),
    enabled,
    // Heavier aggregates than the orders list; refresh on a slower cadence.
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}
