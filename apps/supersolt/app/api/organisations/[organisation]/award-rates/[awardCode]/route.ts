
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { awardService } from "@/server/workforce/award/award.service";

type RouteParams = { organisation: string; awardCode: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, awardCode } = await context.params;
  try {
    const data = await awardService.getRateCard(ctx, { organisationSlug: organisation, awardCode });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "award-rates", { defaultCode: "internal_error" });
  }
}
