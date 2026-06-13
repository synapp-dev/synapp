import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import {
  errorDetailsFromUnknown,
  onboardingLogFinalizeError,
} from "@/server/onboarding/onboarding-route-log";
import { finalizeOnboarding } from "@/server/onboarding/onboarding.service";

export async function POST(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    await finalizeOnboarding(ctx);
    return jsonDataResponse({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onboardingLogFinalizeError("finalize_failed", {
      userId: ctx.userId,
      ...errorDetailsFromUnknown(error),
    });
    return validationErrorResponse(message, 400);
  }
}
