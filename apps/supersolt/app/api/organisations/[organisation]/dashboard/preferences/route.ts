import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  jsonDataResponse,
  serviceErrorResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { dashboardPreferencesPatchSchema } from "@/server/dashboard/dashboard-preferences.schema";
import {
  getDashboardPreferencesForUserOrg,
  resolveOrganisationIdForMemberSlug,
  upsertDashboardPreferencesForUserOrg,
} from "@/server/dashboard/dashboard-preferences.service";

type RouteParams = {
  organisation: string;
};

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
    const organisationId = await resolveOrganisationIdForMemberSlug(
      ctx.appDb,
      ctx.userId,
      organisation,
    );
    if (!organisationId) {
      return validationErrorResponse("Forbidden", 403);
    }

    const prefs = await getDashboardPreferencesForUserOrg(ctx, organisationId);
    return jsonDataResponse(prefs);
  } catch (error) {
    return serviceErrorResponse(error, "dashboard/preferences");
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

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return validationErrorResponse("Invalid JSON");
  }

  const parsed = dashboardPreferencesPatchSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse("Validation failed");
  }

  try {
    const organisationId = await resolveOrganisationIdForMemberSlug(
      ctx.appDb,
      ctx.userId,
      organisation,
    );
    if (!organisationId) {
      return validationErrorResponse("Forbidden", 403);
    }

    const prefs = await upsertDashboardPreferencesForUserOrg(
      ctx,
      organisationId,
      parsed.data,
    );
    return jsonDataResponse(prefs);
  } catch (error) {
    return serviceErrorResponse(error, "dashboard/preferences");
  }
}
