import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import { consumptionService } from "@/server/consumption/consumption.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const sp = new URL(request.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const fromDate = sp.get("from") ?? defaultFrom;
  const toDate = sp.get("to") ?? today;

  try {
    const data = await consumptionService.getExceptions(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      fromDate,
      toDate,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "consumption-exceptions", {
      defaultCode: "consumption.failed",
    });
  }
}
