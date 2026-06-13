import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; menuItemId: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, menuItemId } = await context.params;
  const body = (await request.json()) as { showOnMenu?: boolean };

  if (typeof body.showOnMenu !== "boolean") {
    return serviceErrorResponse(
      new Error("showOnMenu boolean required"),
      "inventory-setup/pos-items/patch",
    );
  }

  try {
    const data = await posCatalogImportService.updateShowOnMenu(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
      showOnMenu: body.showOnMenu,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/pos-items/patch");
  }
}
