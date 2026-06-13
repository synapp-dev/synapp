import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
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
  let body: { reason?: string; asManager?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    await leaveService.cancelRequest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      requestId,
      reason: body.reason,
      asManager: body.asManager === true,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
