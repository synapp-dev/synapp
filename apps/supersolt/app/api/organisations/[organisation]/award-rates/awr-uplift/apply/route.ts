
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { awrUpliftService } from "@/server/workforce/award/awr-uplift.service";

type RouteParams = { organisation: string };

export async function POST(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const body = (await request.json()) as {
    effectiveDate: string;
    awrYear: number;
    sourcePrReference: string;
    rows: Array<{ userProfileId: string; newRateCents: number }>;
  };

  try {
    const data = await awrUpliftService.apply(ctx, {
      organisationSlug: organisation,
      effectiveDate: body.effectiveDate,
      awrYear: body.awrYear,
      sourcePrReference: body.sourcePrReference ?? "PR786658",
      rows: body.rows ?? [],
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "award-rates", { defaultCode: "internal_error" });
  }
}
