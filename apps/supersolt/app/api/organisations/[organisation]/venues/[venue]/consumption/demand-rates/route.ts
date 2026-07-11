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

  try {
    const data = await consumptionService.getDemandRates(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "consumption-demand-rates", {
      defaultCode: "consumption.failed",
    });
  }
}
