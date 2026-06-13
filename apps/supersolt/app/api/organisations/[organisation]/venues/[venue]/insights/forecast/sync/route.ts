import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { requireVenueScope } from "@/server/access/require-venue-scope";
import { isOrganisationAdmin } from "@/server/auth/rbac";
import { syncForecastBackfill } from "@/server/forecast/forecast.service";

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
    return serviceErrorResponse(error, "insights/forecast/sync");
  }

  let daysBack = 90;
  try {
    const body = (await request.json()) as { daysBack?: number };
    if (typeof body.daysBack === "number" && body.daysBack > 0 && body.daysBack <= 365) {
      daysBack = body.daysBack;
    }
  } catch {
    // empty body is fine
  }

  try {
    const result = await syncForecastBackfill(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      daysBack,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/forecast/sync");
  }
}
