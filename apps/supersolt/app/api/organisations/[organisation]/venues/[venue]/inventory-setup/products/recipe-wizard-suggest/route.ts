import { z } from "zod";

import { recipeWizardSuggestService } from "@/server/inventory-setup/recipe-wizard-suggest.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

const bodySchema = z.object({
  menuItemId: z.string().uuid(),
  regenerate: z.boolean().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return validationErrorResponse("Invalid request body");
  }

  try {
    const data = await recipeWizardSuggestService.suggest(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      menuItemId: parsed.data.menuItemId,
      regenerate: parsed.data.regenerate,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/recipe-wizard-suggest");
  }
}
