import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { leaveService } from "@/server/workforce/leave.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  try {
    const data = await leaveService.getPageData(ctx, { organisationSlug: organisation, venueSlug: venue });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let body: {
    leaveTypeId?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string | null;
    endTime?: string | null;
    reason?: string | null;
    commentsToManager?: string | null;
    userProfileId?: string;
    paidHours?: number;
    unpaidHours?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400, "internal_error");
  }

  if (!body.leaveTypeId?.trim() || !body.startDate?.trim() || !body.endDate?.trim()) {
    return validationErrorResponse(
      "leaveTypeId, startDate, and endDate are required",
      400,
      "internal_error",
    );
  }

  try {
    const data = await leaveService.createRequest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      leaveTypeId: body.leaveTypeId.trim(),
      startDate: body.startDate.trim(),
      endDate: body.endDate.trim(),
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason,
      commentsToManager: body.commentsToManager,
      userProfileId: body.userProfileId,
      paidHoursOverride: body.paidHours,
      unpaidHoursOverride: body.unpaidHours,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
