
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const payPeriodId = url.searchParams.get("payPeriodId") ?? undefined;

  try {
    const data = await timesheetService.getPageData(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      payPeriodId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
