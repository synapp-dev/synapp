import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import {
  purchasingSettingsService,
  type UpdatePurchasingSettingsInput,
} from "@/server/purchase-orders/purchasing-settings.service";

type RouteParams = { organisation: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation } = await context.params;

  try {
    const data = await purchasingSettingsService.get(ctx, {
      organisationSlug: organisation,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "purchasing-settings");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const { organisation } = await context.params;
  const body = (await request.json()) as UpdatePurchasingSettingsInput;

  try {
    const data = await purchasingSettingsService.update(ctx, {
      organisationSlug: organisation,
      input: {
        poApprovalThresholdCents: body.poApprovalThresholdCents,
        poEmailTemplate: body.poEmailTemplate,
      },
    });
    return jsonDataResponse(data);
  } catch (error) {
    return serviceErrorResponse(error, "purchasing-settings");
  }
}
