
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse, validationErrorResponse } from "@/lib/api/service-error-response";

import {
  suppliersService,
  type UpsertSupplierInput,
} from "@/server/suppliers/suppliers.service";

type RouteParams = {
  organisation: string;
  venue: string;
  supplierId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, supplierId } = await context.params;

  try {
    const data = await suppliersService.getById(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
    });

    if (!data) {
      return validationErrorResponse("Supplier not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, supplierId } = await context.params;
  const payload = (await request.json()) as UpsertSupplierInput;

  try {
    const data = await suppliersService.update(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      input: payload,
    });

    if (!data) {
      return validationErrorResponse("Supplier not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, supplierId } = await context.params;

  try {
    const deleted = await suppliersService.delete(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
    });

    if (!deleted) {
      return validationErrorResponse("Supplier not found", 404);
    }

    return jsonDataResponse({ deleted: true });
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
