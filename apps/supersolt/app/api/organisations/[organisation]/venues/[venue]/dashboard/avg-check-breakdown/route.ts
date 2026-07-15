import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import { getDashboardAvgCheckBreakdown } from "@/server/sales/dashboard-avg-check-breakdown.service";

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
    const data = await getDashboardAvgCheckBreakdown(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "dashboard-avg-check-breakdown");
  }
}
