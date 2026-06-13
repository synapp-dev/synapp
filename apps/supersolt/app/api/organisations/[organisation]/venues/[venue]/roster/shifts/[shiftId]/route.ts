import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { rosterService } from "@/server/workforce/roster.service";

type RouteParams = {
  organisation: string;
  venue: string;
  shiftId: string;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, shiftId } = await context.params;
  const url = new URL(request.url);
  const weekStart = url.searchParams.get("weekStart")?.trim();

  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return validationErrorResponse("Query param weekStart=YYYY-MM-DD is required");
  }

  try {
    const data = await rosterService.deleteShift(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      shiftId,
      weekStart,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "roster");
  }
}
