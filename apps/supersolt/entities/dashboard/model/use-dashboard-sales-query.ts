"use client";

import { useQuery } from "@tanstack/react-query";

import {
  buildDashboardSalesSnapshot,
  revenueForecastCentsByDate,
  type DashboardLiveSalesSlice,
} from "@/lib/dashboard/build-dashboard-sales-snapshot";
import {
  dashboardSalesFetchIsoRange,
  heroChartWindowInVenue,
} from "@/lib/dashboard/dashboard-sales-week";
import { forecastApi } from "@/entities/forecast/api/endpoints";
import { salesInsightsApi } from "@/entities/sales-insights/api/endpoints";

export const dashboardSalesKeys = {
  all: () => ["dashboard-sales"] as const,
  venue: (org: string, venue: string) =>
    [...dashboardSalesKeys.all(), org, venue] as const,
};

export function useDashboardSalesQuery(input: {
  organisationSlug: string;
  venueSlug: string;
  venueTimezone?: string;
  enabled?: boolean;
  /** Server-prefetched snapshot; skips first fetch when provided. */
  initialData?: DashboardLiveSalesSlice | null;
}) {
  const enabled = (input.enabled ?? true) && Boolean(input.organisationSlug && input.venueSlug);
  const timezone = input.venueTimezone ?? "Australia/Melbourne";

  return useQuery({
    queryKey: dashboardSalesKeys.venue(input.organisationSlug, input.venueSlug),
    queryFn: async (): Promise<DashboardLiveSalesSlice | null> => {
      const { startIso, endIso } = dashboardSalesFetchIsoRange(timezone);
      const { fromDate, toDate } = heroChartWindowInVenue(timezone);

      const [result, forecastPayload] = await Promise.all([
        salesInsightsApi.get.orders({
          organisationSlug: input.organisationSlug,
          venueSlug: input.venueSlug,
          startIso,
          endIso,
        }),
        // Projected revenue is decorative on the hero; never fail the snapshot over it.
        forecastApi.get
          .forecasts({
            organisationSlug: input.organisationSlug,
            venueSlug: input.venueSlug,
            fromDate,
            toDate,
          })
          .catch(() => null),
      ]);

      if (result.meta.dataSource !== "square") {
        return null;
      }

      return buildDashboardSalesSnapshot({
        orders: result.orders,
        timezone: result.meta.venueTimezone ?? timezone,
        revenueForecastCentsByDate: forecastPayload
          ? revenueForecastCentsByDate(forecastPayload.forecasts)
          : undefined,
      });
    },
    enabled,
    initialData: input.initialData ?? undefined,
    staleTime: 60_000,
  });
}
