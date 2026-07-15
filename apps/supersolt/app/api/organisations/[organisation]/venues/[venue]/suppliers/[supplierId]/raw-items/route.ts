import {
  supplierRawItemsService,
  SupplierRawItemsServiceError,
} from "@/server/supplier-raw-items/supplier-raw-items.service";
import type { CreateRawItemInput } from "@/server/supplier-raw-items/supplier-raw-items.schemas";
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
  const search = new URL(request.url).searchParams.get("search") ?? undefined;

  try {
    const data = await supplierRawItemsService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      search,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "supplier-raw-items");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const payload = (await request.json()) as CreateRawItemInput;

  try {
    const data = await supplierRawItemsService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      input: payload,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    if (
      error instanceof SupplierRawItemsServiceError &&
      error.status === 409 &&
      error.existingId
    ) {
      return jsonDataResponse(
        { message: error.message, existingId: error.existingId } satisfies {
          message: string;
          existingId: string;
        },
        409,
      );
    }
    return serviceErrorResponse(error, "supplier-raw-items");
  }
}
