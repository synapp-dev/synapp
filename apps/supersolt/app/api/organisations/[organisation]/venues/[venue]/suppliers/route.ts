import {
  suppliersService,
  type UpsertSupplierInput,
} from "@/server/suppliers/suppliers.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { parseSuppliersListQuery } from "@/lib/api/parse-list-query";

type RouteParams = {
  organisation: string;
  venue: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const params = parseSuppliersListQuery(new URL(request.url).searchParams);

  try {
    const data = await suppliersService.list(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      ...params,
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
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;
  const payload = (await request.json()) as UpsertSupplierInput;

  try {
    const data = await suppliersService.create(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      input: payload,
    });
    return jsonDataResponse(data, 201);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
