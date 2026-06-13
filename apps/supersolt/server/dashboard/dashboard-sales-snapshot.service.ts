import type { RequestAuthContext } from "@/server/auth/context";
import { requireVenueScope } from "@/server/access/require-venue-scope";
import {
  buildDashboardSalesSnapshot,
  type DashboardLiveSalesSlice,
} from "@/lib/dashboard/build-dashboard-sales-snapshot";
import { dashboardSalesFetchIsoRange } from "@/lib/dashboard/dashboard-sales-week";
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

  return buildDashboardSalesSnapshot({
    orders: result.orders,
    timezone: result.meta.venueTimezone ?? context.timezone,
  });
}
