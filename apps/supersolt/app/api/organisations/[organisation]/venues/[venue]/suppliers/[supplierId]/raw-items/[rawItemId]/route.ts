import {
  supplierRawItemsService,
  SupplierRawItemsServiceError,
} from "@/server/supplier-raw-items/supplier-raw-items.service";
import type { UpdateRawItemInput } from "@/server/supplier-raw-items/supplier-raw-items.schemas";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  supplierId: string;
  rawItemId: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, rawItemId } = await context.params;
  const payload = (await request.json()) as UpdateRawItemInput;

  try {
    const data = await supplierRawItemsService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      rawItemId,
      input: payload,
    });
    return jsonDataResponse(data);
  } catch (error) {
    if (
      error instanceof SupplierRawItemsServiceError &&
      error.status === 409 &&
      error.existingId
    ) {
      return jsonDataResponse(
        { message: error.message, existingId: error.existingId },
        409,
      );
    }
    return serviceErrorResponse(error, "supplier-raw-items");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId, rawItemId } = await context.params;

  try {
    const data = await supplierRawItemsService.archive(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      rawItemId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "supplier-raw-items");
  }
}
