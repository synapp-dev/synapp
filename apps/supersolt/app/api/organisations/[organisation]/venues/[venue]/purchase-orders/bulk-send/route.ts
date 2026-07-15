import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const { poIds } = (await request.json()) as { poIds: string[] };

  try {
    const data = await purchaseOrdersService.bulkSend(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      poIds: poIds ?? [],
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "purchase-orders");
  }
}
