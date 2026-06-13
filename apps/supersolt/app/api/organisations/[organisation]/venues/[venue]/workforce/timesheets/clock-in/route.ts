
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let body: { shiftId?: string; lat?: number; lng?: number; at?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const data = await timesheetService.clockIn(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      shiftId: body.shiftId,
      lat: body.lat,
      lng: body.lng,
      at: body.at,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
