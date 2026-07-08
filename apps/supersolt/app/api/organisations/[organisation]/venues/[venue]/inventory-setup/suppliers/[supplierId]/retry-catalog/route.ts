import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";

// A single supplier's 12-month sync + PDF parse can take a while.
export const maxDuration = 300;

type RouteParams = { organisation: string; venue: string; supplierId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, supplierId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    daysBack?: number;
  };

  try {
    const result = await inventorySetupService.retrySupplierCatalogLookback(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      supplierId,
      daysBack:
        typeof body.daysBack === "number" && body.daysBack > 0
          ? body.daysBack
          : undefined,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/retry-catalog");
  }
}
