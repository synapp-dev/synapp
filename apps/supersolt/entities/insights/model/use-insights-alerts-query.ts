"use client";

import { useQuery } from "@tanstack/react-query";
import { insightsAlertsEndpoint } from "@/entities/insights/api/endpoints";
import { insightsAlertKeys } from "@/entities/insights/model/keys";
import type { InsightsAlertModule, InsightsAlertRow } from "@/entities/insights/model/types";

type AlertsResponse = {
  data: { alerts: InsightsAlertRow[] } | null;
  error: { message: string; status: number } | null;
};

export function useInsightsAlertsQuery(args: {
  organisationSlug: string;
  venueSlug: string;
  module?: InsightsAlertModule;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: insightsAlertKeys.list(
      args.organisationSlug,
      args.venueSlug,
      args.module,
    ),
    enabled: args.enabled !== false,
    queryFn: async () => {
      const response = await fetch(
        insightsAlertsEndpoint(
          args.organisationSlug,
          args.venueSlug,
          args.module,
        ),
      );
      const body = (await response.json()) as AlertsResponse;
      if (!response.ok || body.error) {
        throw new Error(body.error?.message ?? "Failed to load insights alerts");
      }
      return body.data?.alerts ?? [];
    },
  });
}
