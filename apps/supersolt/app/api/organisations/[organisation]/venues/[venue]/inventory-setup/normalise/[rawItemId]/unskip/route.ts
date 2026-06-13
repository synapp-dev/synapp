import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; rawItemId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, rawItemId } = await context.params;

  try {
    const data = await inventoryNormalisationService.unskip(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      rawItemId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-normalisation/unskip");
  }
}
