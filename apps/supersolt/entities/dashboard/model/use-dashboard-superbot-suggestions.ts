"use client";

import { useQuery } from "@tanstack/react-query";

import type { SuperbotSuggestion } from "@/entities/dashboard/model/dummy-superbot-suggestions";
import { insightsAlertsEndpoint } from "@/entities/insights/api/endpoints";
import type { InsightsAlertRow } from "@/entities/insights/model/types";
import {
  insightsAlertToSuperbot,
  readinessSuggestionToSuperbot,
} from "@/entities/readiness/lib/to-superbot-suggestion";
import { useVenueReadinessQuery } from "@/entities/readiness/model/use-venue-readiness-query";

export function useDashboardSuperbotSuggestions(args: {
  organisationSlug: string | null | undefined;
  venueSlug: string | null | undefined;
  enabled?: boolean;
}) {
  const readinessQuery = useVenueReadinessQuery({
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    enabled: args.enabled,
  });

  const insightsEnabled = Boolean(
    args.enabled !== false &&
      args.organisationSlug &&
      args.venueSlug &&
      readinessQuery.data?.coreGreen,
  );

  const insightsQuery = useQuery({
    queryKey: [
      "insights-alerts",
      args.organisationSlug,
      args.venueSlug,
      "dashboard",
    ],
    enabled: insightsEnabled,
    queryFn: async () => {
      const res = await fetch(
        insightsAlertsEndpoint(args.organisationSlug!, args.venueSlug!),
        { credentials: "include" },
      );
      if (!res.ok) {
        throw new Error("Failed to load insights alerts");
      }
      const json = (await res.json()) as { data: { alerts: InsightsAlertRow[] } };
      return json.data.alerts;
    },
    staleTime: 60_000,
  });

  const suggestions: SuperbotSuggestion[] = [];

  if (readinessQuery.data && !readinessQuery.data.coreGreen) {
    for (const suggestion of readinessQuery.data.suggestions) {
      suggestions.push(readinessSuggestionToSuperbot(suggestion));
    }
  } else if (insightsQuery.data?.length) {
    for (const alert of insightsQuery.data.slice(0, 4)) {
      suggestions.push(insightsAlertToSuperbot(alert));
    }
  } else if (readinessQuery.data?.suggestions.length) {
    for (const suggestion of readinessQuery.data.suggestions) {
      suggestions.push(readinessSuggestionToSuperbot(suggestion));
    }
  }

  return {
    suggestions,
    isLoading: readinessQuery.isLoading || insightsQuery.isLoading,
    readiness: readinessQuery.data,
  };
}
