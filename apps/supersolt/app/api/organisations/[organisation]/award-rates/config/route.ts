
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { awardService } from "@/server/workforce/award/award.service";

type RouteParams = { organisation: string };

export async function PUT(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const body = (await request.json()) as {
    defaultAwardCode?: string | null;
    isEbaCovered?: boolean;
    casualLoadingPctOverride?: number | null;
  };

  try {
    await awardService.updateOrgConfig(ctx, {
      organisationSlug: organisation,
      defaultAwardCode: body.defaultAwardCode ?? null,
      isEbaCovered: body.isEbaCovered ?? false,
      casualLoadingPctOverride: body.casualLoadingPctOverride ?? null,
    });
    const data = await awardService.listForOrg(ctx, organisation);
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "award-rates", { defaultCode: "internal_error" });
  }
}
