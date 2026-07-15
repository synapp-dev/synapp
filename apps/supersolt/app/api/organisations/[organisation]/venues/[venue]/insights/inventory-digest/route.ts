import { requireRequestAuth } from "@/lib/api/route-auth";
import { serviceErrorResponse } from "@/lib/api/service-error-response";
import { dashboardDigestService } from "@/server/dashboard/dashboard-digest.service";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue } = await context.params;

  try {
    return await dashboardDigestService.streamInventoryDigest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
    });
  } catch (error) {
    return serviceErrorResponse(error, "inventory-digest");
  }
}
