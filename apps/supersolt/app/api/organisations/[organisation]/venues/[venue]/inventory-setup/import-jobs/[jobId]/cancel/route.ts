import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; jobId: string };

// Abort an in-flight import. Everything already read is kept; a re-run resumes.
export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, jobId } = await context.params;

  try {
    const data = await inventorySetupService.cancelImportJob(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      jobId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/import-jobs/cancel");
  }
}
