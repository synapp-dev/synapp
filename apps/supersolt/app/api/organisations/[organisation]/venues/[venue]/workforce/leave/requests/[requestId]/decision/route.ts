import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { leaveService } from "@/server/workforce/leave.service";

type RouteParams = { organisation: string; venue: string; requestId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, requestId } = await context.params;
  let body: { approved?: boolean; reason?: string; rosterResolution?: { mode: "unassign_all" | "keep_all"; shiftIds?: string[] } };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400, "internal_error");
  }

  if (typeof body.approved !== "boolean") {
    return validationErrorResponse("approved (boolean) is required", 400, "internal_error");
  }

  try {
    await leaveService.decideRequest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      requestId,
      approved: body.approved,
      reason: body.reason,
      rosterResolution: body.rosterResolution,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
