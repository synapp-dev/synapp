import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { rosterService } from "@/server/workforce/roster.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let body: { weekStart?: string };
  try {
    body = (await request.json()) as { weekStart?: string };
  } catch {
    return validationErrorResponse("Invalid JSON body");
  }

  const weekStart = body.weekStart?.trim();
  if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return validationErrorResponse("weekStart=YYYY-MM-DD is required");
  }

  try {
    const data = await rosterService.autoBuildWeek(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      weekStart,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "roster");
  }
}
