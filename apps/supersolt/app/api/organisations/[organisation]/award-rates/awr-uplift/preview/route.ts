
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { awrUpliftService } from "@/server/workforce/award/awr-uplift.service";

type RouteParams = { organisation: string };

export async function GET(request: Request, context: { params: Promise<RouteParams> }) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const url = new URL(request.url);
  const effectiveDate = url.searchParams.get("effectiveDate") ?? "2026-07-01";
  const awrYear = Number(url.searchParams.get("awrYear") ?? "2026");

  try {
    const data = await awrUpliftService.preview(ctx, { organisationSlug: organisation, effectiveDate, awrYear });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "award-rates", { defaultCode: "internal_error" });
  }
}
