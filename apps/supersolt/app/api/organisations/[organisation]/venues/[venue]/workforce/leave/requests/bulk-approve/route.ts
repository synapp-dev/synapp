import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { leaveService } from "@/server/workforce/leave.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let body: { requestIds?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return validationErrorResponse("Invalid JSON body", 400, "internal_error");
  }

  const requestIds = body.requestIds?.filter(Boolean) ?? [];
  if (requestIds.length === 0) {
    return validationErrorResponse("requestIds is required", 400, "internal_error");
  }

  try {
    await leaveService.bulkApprove(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      requestIds,
    });
    return jsonDataResponse({ ok: true, count: requestIds.length });
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
