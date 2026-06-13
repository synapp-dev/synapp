import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const body = (await request.json()) as { ids?: string[] };

  if (!body.ids?.length) {
    return NextResponse.json(
      { data: null, error: { message: "ids required", status: 400, code: "internal_error" } },
      { status: 400 },
    );
  }

  try {
    const data = await timesheetService.bulkApprove(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ids: body.ids,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
