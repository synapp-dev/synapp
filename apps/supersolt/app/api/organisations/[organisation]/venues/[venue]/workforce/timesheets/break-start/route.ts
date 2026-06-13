
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string };

async function handleBreak(
  request: Request,
  context: { params: Promise<RouteParams> },
  mode: "breakStart" | "breakEnd",
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;

  try {
    const data =
      mode === "breakStart"
        ? await timesheetService.breakStart(ctx, { organisationSlug: organisation, venueSlug: venue })
        : await timesheetService.breakEnd(ctx, { organisationSlug: organisation, venueSlug: venue });
    return jsonDataResponse(data);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  return handleBreak(request, context, "breakStart");
}
