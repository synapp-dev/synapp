import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { leaveService } from "@/server/workforce/leave.service";

type RouteParams = { organisation: string; venue: string; requestId: string };

export async function POST(
  _request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(_request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, requestId } = await context.params;
  try {
    await leaveService.withdrawRequest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      requestId,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
