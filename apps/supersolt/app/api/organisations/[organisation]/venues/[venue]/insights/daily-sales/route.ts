import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { getDailySalesForVenue } from "@/server/forecast/forecast.service";

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
  const fromDate = url.searchParams.get("from")?.trim() ?? "";
  const toDate = url.searchParams.get("to")?.trim() ?? "";

  if (!fromDate || !toDate) {
    return validationErrorResponse(
      "Query params from and to (YYYY-MM-DD) are required",
    );
  }

  try {
    const result = await getDailySalesForVenue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromDate,
      toDate,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "insights/daily-sales");
  }
}
