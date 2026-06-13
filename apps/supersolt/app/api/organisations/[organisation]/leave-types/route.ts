import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { leaveService } from "@/server/workforce/leave.service";

type RouteParams = { organisation: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  try {
    const data = await leaveService.listOrgLeaveTypes(ctx, organisation);
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "leave", { defaultCode: "internal_error" });
  }
}
