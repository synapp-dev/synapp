import { z } from "zod";

import { posCatalogImportService } from "@/server/pos-catalog-import/pos-catalog-import.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  menuItemId: string;
  modifierListId: string;
};

const patchSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, menuItemId, modifierListId } = await context.params;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return validationErrorResponse("enabled must be a boolean", 400);
  }

  try {
    await posCatalogImportService.setModifierListEnabled(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId,
      modifierListId,
      enabled: parsed.data.enabled,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/pos-items/modifier-list");
  }
}
