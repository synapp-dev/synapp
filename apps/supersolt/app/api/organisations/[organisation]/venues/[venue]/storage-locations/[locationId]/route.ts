import { storageLocationsService } from "@/server/stock-counts/storage-locations.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; locationId: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, locationId } = await context.params;
  const body = (await request.json()) as { name?: string; displayOrder?: number };

  try {
    const data = await storageLocationsService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      locationId,
      name: body.name,
      displayOrder: body.displayOrder,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, locationId } = await context.params;

  try {
    const data = await storageLocationsService.remove(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      locationId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
