import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { timesheetErrorResponse } from "@/app/api/organisations/[organisation]/venues/[venue]/workforce/timesheets/_lib/timesheet-error-response";
import { timesheetService } from "@/server/workforce/timesheet.service";

type RouteParams = { organisation: string; venue: string; timesheetId: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, timesheetId } = await context.params;
  const body = (await request.json()) as {
    claimedStartsAt?: string;
    claimedEndsAt?: string;
    claimNotes?: string;
  };

  if (!body.claimNotes?.trim()) {
    return NextResponse.json(
      { data: null, error: { message: "claimNotes required", status: 400, code: "internal_error" } },
      { status: 400 },
    );
  }

  try {
    const data = await timesheetService.dispute(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      timesheetId,
      claimedStartsAt: body.claimedStartsAt,
      claimedEndsAt: body.claimedEndsAt,
      claimNotes: body.claimNotes,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return timesheetErrorResponse(error);
  }
}
