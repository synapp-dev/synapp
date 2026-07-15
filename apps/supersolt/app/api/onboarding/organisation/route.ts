import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import {
  errorDetailsFromUnknown,
  onboardingLogOrganisationError,
} from "@/server/onboarding/onboarding-route-log";
import { upsertOnboardingOrganisation } from "@/server/onboarding/onboarding.service";

type Body = {
  name?: string;
  abn?: string | null;
  isGstRegistered?: boolean;
  organisationId?: string | null;
  isTestRun?: boolean;
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

  try {
    const organisation = await upsertOnboardingOrganisation(ctx, {
      name: body.name ?? "",
      abn: body.abn,
      isGstRegistered: body.isGstRegistered,
      organisationId: body.organisationId,
      isTestRun: body.isTestRun,
    });
    return jsonDataResponse({ organisation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    onboardingLogOrganisationError("upsert_failed", {
      userId: ctx.userId,
      ...errorDetailsFromUnknown(error),
    });
    return validationErrorResponse(message, 400);
  }
}
