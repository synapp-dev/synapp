import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { requireVenueScope } from "@/server/access/require-venue-scope";
import { isOrganisationAdmin } from "@/server/auth/rbac";
import { recomputeForecastsOnly } from "@/server/forecast/forecast.service";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    const venueContext = await requireVenueScope(ctx, organisation, venue);
    if (!isOrganisationAdmin(ctx.tenantRoles, venueContext.organisationId)) {
      return validationErrorResponse("Forbidden", 403);
    }
  } catch (error) {
    return serviceErrorResponse(error, "insights/forecast/recompute");
  }

  try {
    const result = await recomputeForecastsOnly(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/forecast/recompute");
  }
}
