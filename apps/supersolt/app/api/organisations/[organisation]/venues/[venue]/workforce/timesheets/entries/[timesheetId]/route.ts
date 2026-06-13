
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string; timesheetId: string };

export async function PATCH(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, timesheetId } = await context.params;
  const body = (await request.json()) as {
    actualStartsAt?: string;
    actualEndsAt?: string;
    actualBreakMinutes?: number;
    reason?: string;
  };

  try {
    const data = await timesheetService.editEntry(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      timesheetId,
      actualStartsAt: body.actualStartsAt,
      actualEndsAt: body.actualEndsAt,
      actualBreakMinutes: body.actualBreakMinutes,
      reason: body.reason ?? "",
    });
    return jsonDataResponse(data);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
