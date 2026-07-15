import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import {
  getSalesIntelligence,
  type SalesIntelligenceScope,
} from "@/server/sales/sales-intelligence.service";

const VALID_SCOPES: SalesIntelligenceScope[] = ["full", "menu", "patterns"];

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const url = new URL(request.url);
  const startIso = url.searchParams.get("start")?.trim() ?? "";
  const endIso = url.searchParams.get("end")?.trim() ?? "";
  const scopeParam = url.searchParams.get("scope")?.trim() || "full";

  if (!startIso || !endIso) {
    return validationErrorResponse(
      "Query params start and end (ISO 8601) are required",
    );
  }
  if (!VALID_SCOPES.includes(scopeParam as SalesIntelligenceScope)) {
    return validationErrorResponse(
      `Query param scope must be one of: ${VALID_SCOPES.join(", ")}`,
    );
  }

  try {
    const result = await getSalesIntelligence(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      startIso,
      endIso,
      scope: scopeParam as SalesIntelligenceScope,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "sales-intelligence");
  }
}
