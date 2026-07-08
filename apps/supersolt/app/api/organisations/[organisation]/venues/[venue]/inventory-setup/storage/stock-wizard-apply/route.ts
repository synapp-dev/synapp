import { z } from "zod";

import { stockWizardService } from "@/server/inventory-setup/stock-wizard.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantity: z.number().nonnegative(),
        locationId: z.string().uuid().nullable(),
      }),
    )
    .min(1)
    .max(500),
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
    const data = await stockWizardService.apply(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      items: parsed.data.items,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/stock-wizard-apply");
  }
}
