"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  DashboardAvgCheckBreakdown,
  DashboardAvgCheckCategory,
} from "@/server/sales/dashboard-avg-check-breakdown.service";

export type { DashboardAvgCheckBreakdown, DashboardAvgCheckCategory };

export const dashboardAvgCheckBreakdownKeys = {
  all: () => ["dashboard-avg-check-breakdown"] as const,
  venue: (org: string, venue: string) =>
    [...dashboardAvgCheckBreakdownKeys.all(), org, venue] as const,
};

export function useDashboardAvgCheckBreakdown(input: {
  organisationSlug: string;
  venueSlug: string;
  enabled?: boolean;
}) {
  const enabled =
    (input.enabled ?? true) &&
    Boolean(input.organisationSlug && input.venueSlug);

  return useQuery({
    queryKey: dashboardAvgCheckBreakdownKeys.venue(
      input.organisationSlug,
      input.venueSlug,
    ),
    queryFn: async (): Promise<DashboardAvgCheckBreakdown | null> => {
      const response = await fetch(
        `/api/organisations/${input.organisationSlug}/venues/${input.venueSlug}/dashboard/avg-check-breakdown`,
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        data: DashboardAvgCheckBreakdown | null;
      };
      return payload.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
