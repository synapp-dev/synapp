import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import { wasteService } from "@/server/consumption/waste.service";

type RouteParams = { organisation: string; venue: string; entryId: string };

export async function DELETE(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation, venue, entryId } = await context.params;

  try {
    const data = await wasteService.remove(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      entryId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "waste-entries", {
      defaultCode: "waste.failed",
    });
  }
}
