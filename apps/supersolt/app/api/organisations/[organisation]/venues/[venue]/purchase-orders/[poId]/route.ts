import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";
import type { UpsertPoLineInput } from "@/server/purchase-orders/purchase-orders.types";

type RouteParams = { organisation: string; venue: string; poId: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, poId } = await context.params;

  try {
    const data = await purchaseOrdersService.getDetail(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      poId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, poId } = await context.params;
  const body = (await request.json()) as {
    expectedDeliveryDate?: string | null;
    notes?: string | null;
    lines?: UpsertPoLineInput[];
  };

  try {
    const data = await purchaseOrdersService.updateDraft(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      poId,
      ...body,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}
