"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  DashboardTopSeller,
  DashboardTopSellingItems,
} from "@/server/sales/sales-insights-summary.service";

export type { DashboardTopSeller, DashboardTopSellingItems };

export const dashboardTopItemKeys = {
  all: () => ["dashboard-top-items"] as const,
  venue: (org: string, venue: string) =>
    [...dashboardTopItemKeys.all(), org, venue] as const,
};

export function useDashboardTopItems(input: {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
}) {
  const enabled =
    (input.enabled ?? true) &&
    Boolean(input.organisationSlug && input.venueSlug);

  return useQuery({
    queryKey: dashboardTopItemKeys.venue(
      input.organisationSlug,
      input.venueSlug,
    ),
    queryFn: async (): Promise<DashboardTopSellingItems | null> => {
      const response = await fetch(
        `/api/organisations/${input.organisationSlug}/venues/${input.venueSlug}/dashboard/top-items`,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        data: DashboardTopSellingItems | null;
      };
      return payload.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
