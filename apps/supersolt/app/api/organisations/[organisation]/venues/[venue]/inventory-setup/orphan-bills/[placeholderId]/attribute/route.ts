import { orphanAttributionService } from "@/server/inventory-setup/orphan-attribution.service";
import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";

type RouteParams = {
  organisation: string;
  venue: string;
  placeholderId: string;
};

type AttributeBody = {
  target?:
    | { kind: "existing"; supplierId: string }
    | { kind: "create"; name: string };
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, venue, placeholderId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as AttributeBody;

  const target = body.target;
  const valid =
    (target?.kind === "existing" && typeof target.supplierId === "string") ||
    (target?.kind === "create" && typeof target.name === "string");
  if (!valid) {
    return validationErrorResponse(
      "target must be {kind:'existing',supplierId} or {kind:'create',name}",
      400,
    );
  }

  try {
    const data = await orphanAttributionService.attribute(ctx, {
      organisationSlug: organisation,
      venueSlug: venue,
      placeholderSupplierId: placeholderId,
      target: target!,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "inventory-setup/orphan-bills/attribute");
  }
}
