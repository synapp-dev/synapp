import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import {
  errorDetailsFromUnknown,
  onboardingLogVenueError,
} from "@/server/onboarding/onboarding-route-log";
import { createOnboardingVenue } from "@/server/onboarding/onboarding.service";

type Body = {
  organisationId?: string;
  name?: string;
  addressLine1?: string | null;
  timezone?: string;
  dataStartsFrom?: string;
};

export async function POST(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return validationErrorResponse("Invalid JSON");
  }

  if (!body.organisationId?.trim()) {
    return validationErrorResponse("organisationId is required");
  }

  try {
    const venue = await createOnboardingVenue(ctx, {
      organisationId: body.organisationId.trim(),
      name: body.name ?? "",
      addressLine1: body.addressLine1,
      timezone: body.timezone,
      dataStartsFrom: body.dataStartsFrom,
    });
    return jsonDataResponse({ venue });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onboardingLogVenueError("create_failed", {
      userId: ctx.userId,
      organisationId: body.organisationId?.trim() ?? "",
      ...errorDetailsFromUnknown(error),
    });
    return validationErrorResponse(message, 400);
  }
}
