import { supplierProductsService } from "@/server/supplier-products/supplier-products.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  supplierId: string;
  productId: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, productId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { propagateCost?: boolean };

  try {
    const data = await supplierProductsService.makeActive(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      productId,
      propagateCost: body.propagateCost,
    });

    if (!data) {
      return validationErrorResponse("Product not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
