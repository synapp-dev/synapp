import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import type { PatchStockCountInput } from "@/server/stock-counts/stock-counts.types";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  countId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, countId } = await context.params;

  try {
    const data = await stockCountsService.get(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      countId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, countId } = await context.params;
  const input = (await request.json()) as PatchStockCountInput;

  try {
    const data = await stockCountsService.patch(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      countId,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
