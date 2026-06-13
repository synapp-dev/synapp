
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { awardService } from "@/server/workforce/award/award.service";

type RouteParams = { organisation: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  try {
    const data = await awardService.listForOrg(ctx, organisation);
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "award-rates", { defaultCode: "internal_error" });
  }
}
