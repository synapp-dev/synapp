import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";
import { orderGuideService } from "@/server/purchase-orders/order-guide.service";
import type { OrderGuidePeriodPreset } from "@/server/purchase-orders/order-guide.service";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const sp = new URL(request.url).searchParams;
  const periodPreset = (sp.get("period") ?? "7d") as OrderGuidePeriodPreset;
  const forceRefresh = sp.get("refresh") === "1";

  try {
    const data = await orderGuideService.get(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      periodPreset,
      forceRefresh,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const body = (await request.json()) as {
    action: "refresh" | "create-pos";
    periodPreset?: OrderGuidePeriodPreset;
    selections?: Parameters<
      typeof orderGuideService.createDraftPosFromSelections
    >[1]["selections"];
  };

  try {
    if (body.action === "refresh") {
      const data = await orderGuideService.get(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        periodPreset: body.periodPreset ?? "7d",
        forceRefresh: true,
      });
      return jsonDataResponse(data);
    }

    if (body.action === "create-pos") {
      const data = await orderGuideService.createDraftPosFromSelections(ctx, {
        organisationSlug: organisation,
        venueSlug: venue,
        selections: body.selections ?? [],
      });
      return jsonDataResponse(data, 201);
    }

    return validationErrorResponse("Unknown action", 400);
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}
