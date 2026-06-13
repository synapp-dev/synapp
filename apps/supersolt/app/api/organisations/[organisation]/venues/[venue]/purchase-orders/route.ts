import { purchaseOrdersService } from "@/server/purchase-orders/purchase-orders.service";
import type { CreatePurchaseOrderInput } from "@/server/purchase-orders/purchase-orders.types";
import type { PoStatus } from "@/server/purchase-orders/purchase-orders.repo";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { domainErrorResponse } from "@/lib/api/service-error-response";

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
  const status = (sp.get("status") ?? "all") as PoStatus | "all";
  const supplierId = sp.get("supplierId") ?? undefined;
  const search = sp.get("search") ?? undefined;
  const fromDate = sp.get("fromDate") ?? undefined;
  const toDate = sp.get("toDate") ?? undefined;

  try {
    const data = await purchaseOrdersService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      status: status === "all" ? "all" : status,
      supplierId,
      search,
      fromDate,
      toDate,
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
  const input = (await request.json()) as CreatePurchaseOrderInput;

  try {
    const data = await purchaseOrdersService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return domainErrorResponse(error, "purchase-orders");
  }
}
