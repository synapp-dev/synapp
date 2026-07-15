import type { RequestAuthContext } from "@/server/auth/context";
import { requireVenueScope } from "@/server/access/require-venue-scope";
import {
  buildDashboardSalesSnapshot,
  revenueForecastCentsByDate,
  type DashboardLiveSalesSlice,
} from "@/lib/dashboard/build-dashboard-sales-snapshot";
import {
  dashboardSalesFetchIsoRange,
  heroChartWindowInVenue,
} from "@/lib/dashboard/dashboard-sales-week";
import { getForecastsForVenue } from "@/server/forecast/forecast.service";
import { getSalesInsightsOrders } from "@/server/sales/sales-insights.service";

export async function loadDashboardLiveSalesSnapshot(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
  },
): Promise<DashboardLiveSalesSlice | null> {
  let context;
  try {
    context = await requireVenueScope(ctx, args.organisationSlug, args.venueSlug);
  } catch {
    return null;
  }

  const { startIso, endIso } = dashboardSalesFetchIsoRange(context.timezone);

  const result = await getSalesInsightsOrders(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
    startIso,
    endIso,
  });

  if (result.meta.dataSource !== "square") {
    return null;
  }

  const timezone = result.meta.venueTimezone ?? context.timezone;

  // Projected revenue for the hero chart; the dashboard still renders without it.
  let forecastMap: Record<string, number> | undefined;
  try {
    const { fromDate, toDate } = heroChartWindowInVenue(timezone);
    const { forecasts } = await getForecastsForVenue(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      fromDate,
      toDate,
    });
    forecastMap = revenueForecastCentsByDate(forecasts);
  } catch (error) {
    console.error("[dashboard] revenue forecast fetch", error);
  }

  return buildDashboardSalesSnapshot({
    orders: result.orders,
    timezone,
    revenueForecastCentsByDate: forecastMap,
  });
}
