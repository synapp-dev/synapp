import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; menuItemId: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, menuItemId } = await context.params;

  try {
    const data = await posCatalogImportService.getRecipeIngredientSuggestions(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/pos-items/recipe-ingredient-suggestions");
  }
}
