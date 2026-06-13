import { stockCountsService } from "@/server/stock-counts/stock-counts.service";
import type { StockCountActionInput } from "@/server/stock-counts/stock-counts.types";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { domainErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  countId: string;
  action: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, countId, action } = await context.params;
  const input = (await request.json().catch(() => ({}))) as StockCountActionInput;

  try {
    const data = await stockCountsService.action(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      countId,
      action,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "stock-counts");
  }
}
