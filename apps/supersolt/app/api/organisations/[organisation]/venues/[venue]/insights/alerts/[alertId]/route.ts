
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

import { dismissInsightsAlert } from "@/server/insights/alerts.service";

type RouteParams = {
  organisation: string;
  venue: string;
  alertId: string;
};

export async function PATCH(
  _request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(_request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, alertId } = await context.params;

  try {
    const result = await dismissInsightsAlert(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      alertId,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/alerts");
  }
}
