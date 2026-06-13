import { inventoryNormalisationService } from "@/server/inventory-normalisation/inventory-normalisation.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const body: unknown = await request.json();

  try {
    const data = await inventoryNormalisationService.suggest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      body,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-normalisation/suggest");
  }
}
