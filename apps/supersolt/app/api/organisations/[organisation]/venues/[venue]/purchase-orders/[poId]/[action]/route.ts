import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";
import type { ReceivePurchaseOrderInput } from "@/server/purchase-orders/purchase-orders.types";

type RouteParams = {
  organisation: string;
  venue: string;
  poId: string;
  action: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, poId, action } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const base = {
      organisationSlug: organisation,
      venueSlug: venue,
      poId,
    };

    switch (action) {
      case "send": {
        const data = await purchaseOrdersService.send(ctx, base);
        return jsonDataResponse(data);
      }
      case "approve": {
        const data = await purchaseOrdersService.approve(ctx, {
          ...base,
          comment: (body as { comment?: string }).comment,
        });
        return jsonDataResponse(data);
      }
      case "reject": {
        const data = await purchaseOrdersService.reject(ctx, {
          ...base,
          comment: (body as { comment: string }).comment ?? "Rejected",
        });
        return jsonDataResponse(data);
      }
      case "confirm": {
        const data = await purchaseOrdersService.confirm(ctx, {
          ...base,
          expectedDeliveryDate: (body as { expectedDeliveryDate?: string })
            .expectedDeliveryDate,
        });
        return jsonDataResponse(data);
      }
      case "receive": {
        const data = await purchaseOrdersService.receive(ctx, {
          ...base,
          input: body as ReceivePurchaseOrderInput,
        });
        return jsonDataResponse(data);
      }
      case "close": {
        const data = await purchaseOrdersService.close(ctx, base);
        return jsonDataResponse(data);
      }
      case "cancel": {
        const data = await purchaseOrdersService.cancel(ctx, {
          ...base,
          reason: (body as { reason: string }).reason ?? "Cancelled",
        });
        return jsonDataResponse(data);
      }
      default:
        return validationErrorResponse("Unknown action", 404);
    }
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}
