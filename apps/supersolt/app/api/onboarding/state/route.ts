import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
} from "@/lib/api/service-error-response";
import {
  errorDetailsFromUnknown,
  onboardingLogStateError,
} from "@/server/onboarding/onboarding-route-log";
import { getOnboardingState } from "@/server/onboarding/onboarding.service";

export async function GET(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  try {
    const state = await getOnboardingState(ctx);
    return jsonDataResponse(state);
  } catch (error) {
    onboardingLogStateError("get_state_failed", {
      userId: ctx.userId,
      ...errorDetailsFromUnknown(error),
    });
    return serviceErrorResponse(error, "onboarding/state");
  }
}
