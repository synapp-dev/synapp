import { inventorySetupService } from "@/server/inventory-setup/inventory-setup.service";
import { squareCatalogImportService } from "@/server/inventory-setup/square-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  let jobType: "xero" | "square_catalog" = "xero";
  try {
    const body = (await request.json()) as { jobType?: "xero" | "square_catalog" };
    if (body.jobType === "square_catalog") {
      jobType = "square_catalog";
    }
  } catch {
    jobType = "xero";
  }

  try {
    const data =
      jobType === "square_catalog"
        ? await squareCatalogImportService.createImportJob(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
          })
        : await inventorySetupService.createImportJob(ctx, {
            organisationSlug: organisation,
            venueSlug: venue,
          });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/import-jobs");
  }
}
