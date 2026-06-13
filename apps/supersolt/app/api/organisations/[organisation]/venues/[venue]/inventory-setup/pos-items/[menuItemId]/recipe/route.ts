import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string; menuItemId: string };

export async function PUT(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, menuItemId } = await context.params;
  const body = (await request.json()) as { recipeId?: string | null };

  try {
    await posCatalogImportService.mapRecipe(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
      recipeId: body.recipeId ?? null,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/pos-items/recipe");
  }
}
