"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardInsightTiles } from "@/server/dashboard/dashboard-digest.service";

export type { DashboardInsightTiles };

export const dashboardInsightTileKeys = {
  all: () => ["dashboard-insight-tiles"] as const,
  venue: (org: string, venue: string) =>
    [...dashboardInsightTileKeys.all(), org, venue] as const,
};

export function useDashboardInsightTiles(input: {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
}) {
  const enabled =
    (input.enabled ?? true) &&
    Boolean(input.organisationSlug && input.venueSlug);

  return useQuery({
    queryKey: dashboardInsightTileKeys.venue(
      input.organisationSlug,
      input.venueSlug,
    ),
    queryFn: async (): Promise<DashboardInsightTiles | null> => {
      const response = await fetch(
        `/api/organisations/${input.organisationSlug}/venues/${input.venueSlug}/dashboard/insight-tiles`,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        data: DashboardInsightTiles | null;
      };
      return payload.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
