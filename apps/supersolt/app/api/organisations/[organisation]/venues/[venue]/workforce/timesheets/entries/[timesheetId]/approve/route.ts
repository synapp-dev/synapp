
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string; timesheetId: string };

export async function POST(_request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(_request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, timesheetId } = await context.params;

  try {
    const data = await timesheetService.approve(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      timesheetId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
