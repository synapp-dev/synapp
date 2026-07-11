import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse } from "@/lib/api/service-error-response";
import { orderGuideReasoningService } from "@/server/purchase-orders/order-guide-reasoning.service";
import type { OrderGuidePeriodPreset } from "@/server/purchase-orders/order-guide.service";

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
  const body = (await request.json().catch(() => ({}))) as {
    periodPreset?: OrderGuidePeriodPreset;
  };

  try {
    return await orderGuideReasoningService.streamReasoning(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      periodPreset: body.periodPreset,
    });
  } catch (error) {
    return serviceErrorResponse(error, "order-guide-reasoning");
  }
}
