import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { squareCatalogImportService } from "@/server/inventory-setup/square-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const jobTypeParam = new URL(request.url).searchParams.get("jobType");
  const jobType =
    jobTypeParam === "square_catalog" ? ("square_catalog" as const) : ("xero" as const);

  try {
    const data =
      jobType === "square_catalog"
        ? await squareCatalogImportService.getActiveImportJob(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
          })
        : await inventorySetupService.getActiveImportJob(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
          });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/import-jobs/active");
  }
}
