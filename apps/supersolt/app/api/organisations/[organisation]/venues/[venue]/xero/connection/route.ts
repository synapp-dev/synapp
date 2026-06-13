
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";

import { getVenueXeroConnectionSummary } from "@/server/xero/venue-xero-connection";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  const summary = await getVenueXeroConnectionSummary(ctx, {
    organisationSlug: organisation,
    venueSlug: venue,
  });

  return jsonDataResponse(summary);
}
