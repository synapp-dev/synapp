import { suppliersService } from "@/server/suppliers/suppliers.service";
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
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { acked?: boolean };

  if (typeof body.acked !== "boolean") {
    return validationErrorResponse("`acked` must be a boolean", 400);
  }

  try {
    const data = await suppliersService.setNoCatalogAck(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      acked: body.acked,
    });

    if (!data) {
      return validationErrorResponse("Supplier not found", 404);
    }

    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers");
  }
}
