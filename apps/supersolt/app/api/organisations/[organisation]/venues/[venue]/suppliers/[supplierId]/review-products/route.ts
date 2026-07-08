import { supplierRawItemsService } from "@/server/supplier-raw-items/supplier-raw-items.service";
import type { ApproveAsProductsInput } from "@/server/supplier-raw-items/supplier-raw-items.schemas";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  supplierId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;

  try {
    const data = await supplierRawItemsService.listReviewProducts(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "supplier-review-products");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const input = (await request.json()) as ApproveAsProductsInput;

  try {
    const data = await supplierRawItemsService.approveAsProducts(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      input,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "supplier-review-products");
  }
}
