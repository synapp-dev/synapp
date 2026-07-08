import { suggestSupplierFieldsService } from "@/server/suppliers/suggest-supplier-fields.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";

export const maxDuration = 60;

type RouteParams = { organisation: string; venue: string; supplierId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;

  try {
    const data = await suggestSupplierFieldsService.suggest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "suppliers/suggest-fields");
  }
}
