import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import type { OrganisationSetupProgress } from "@/entities/onboarding/model/types";
import {
  errorDetailsFromUnknown,
  onboardingLogStateError,
} from "@/server/onboarding/onboarding-route-log";
import { patchOnboardingProgress } from "@/server/onboarding/onboarding.service";

type Body = OrganisationSetupProgress;

export async function PATCH(request: Request) {
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

  const allowedKeys = ["xeroSkipped", "teamSkipped", "squareConnectedAt"] as const;
  const patch: OrganisationSetupProgress = {};
  for (const key of allowedKeys) {
    if (key in body && body[key] !== undefined) {
      patch[key] = body[key] as never;
    }
  }

  if (Object.keys(patch).length === 0) {
    return validationErrorResponse("No valid fields to update");
  }

  try {
    const setupProgress = await patchOnboardingProgress(ctx, patch);
    return jsonDataResponse({ setupProgress });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onboardingLogStateError("patch_progress_failed", {
      userId: ctx.userId,
      ...errorDetailsFromUnknown(error),
    });
    return validationErrorResponse(message, 400);
  }
}
