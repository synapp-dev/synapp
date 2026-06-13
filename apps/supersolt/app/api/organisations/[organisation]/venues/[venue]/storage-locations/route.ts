import { storageLocationsService } from "@/server/stock-counts/storage-locations.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;

  try {
    const data = await storageLocationsService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const body = (await request.json()) as { name?: string; displayOrder?: number };

  try {
    const data = await storageLocationsService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      name: body.name ?? "",
      displayOrder: body.displayOrder,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
