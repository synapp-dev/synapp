
import {
  supplierProductsService,
  SupplierProductsServiceError,
  type UpsertSupplierProductInput,
} from "@/server/supplier-products/supplier-products.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse, jsonDataResponse } from "@/lib/api/service-error-response";

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
    const data = await supplierProductsService.listForSupplier(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      search,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const payload = (await request.json()) as UpsertSupplierProductInput;

  try {
    const data = await supplierProductsService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      input: payload,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
