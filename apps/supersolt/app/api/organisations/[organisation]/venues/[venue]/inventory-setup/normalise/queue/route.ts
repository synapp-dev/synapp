import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const search = new URL(request.url).searchParams.get("search") ?? undefined;

  try {
    const data = await inventoryNormalisationService.getQueue(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      search,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-normalisation/queue");
  }
}
