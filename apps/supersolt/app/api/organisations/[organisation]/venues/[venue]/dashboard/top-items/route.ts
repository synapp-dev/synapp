import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import {
  DASHBOARD_TOP_ITEMS_DEFAULT_LIMIT,
  getDashboardTopSellingItems,
} from "@/server/sales/sales-insights-summary.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    const data = await getDashboardTopSellingItems(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      limit: DASHBOARD_TOP_ITEMS_DEFAULT_LIMIT,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "dashboard-top-items");
  }
}
