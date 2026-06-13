import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { getSquareInvoicesForInsights } from "@/server/sales/square-invoices.service";

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

  if (!startIso || !endIso) {
    return validationErrorResponse(
      "Query params start and end (ISO 8601) are required",
    );
  }

  try {
    const result = await getSquareInvoicesForInsights(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      startIso,
      endIso,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/square-invoices");
  }
}
