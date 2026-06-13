import { wizardStateService } from "@/server/inventory-setup/wizard-state.service";
import { wizardStatePatchSchema } from "@/server/inventory-setup/wizard-state.schemas";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = { organisation: string; venue: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationErrorResponse("Invalid request body");
  }

  const parsed = wizardStatePatchSchema.safeParse(body);
  if (!parsed.success) {
    return validationErrorResponse(
      parsed.error.issues[0]?.message ?? "Invalid wizard-state patch",
    );
  }

  try {
    const data = await wizardStateService.patch(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      patch: parsed.data,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/wizard-state");
  }
}
