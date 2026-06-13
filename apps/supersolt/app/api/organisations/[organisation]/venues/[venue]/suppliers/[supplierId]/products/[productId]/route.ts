import {
  supplierProductsService,
  type UpsertSupplierProductInput,
} from "@/server/supplier-products/supplier-products.service";
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

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, productId } = await context.params;

  try {
    const data = await supplierProductsService.getById(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      productId,
    });

    if (!data) {
      return validationErrorResponse("Product not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, productId } = await context.params;
  const payload = (await request.json()) as UpsertSupplierProductInput & {
    propagateCost?: boolean;
  };

  try {
    const data = await supplierProductsService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      productId,
      input: payload,
      propagateCost: payload.propagateCost,
    });

    if (!data) {
      return validationErrorResponse("Product not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, productId } = await context.params;

  try {
    const archived = await supplierProductsService.archive(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      productId,
    });

    if (!archived) {
      return validationErrorResponse("Product not found", 404);
    }

    return jsonDataResponse({ archived: true });
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
