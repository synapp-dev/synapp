import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse, serviceErrorResponse } from "@/lib/api/service-error-response";
import { peopleService } from "@/server/workforce/people.service";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import { PeopleServiceError } from "@/server/workforce/people-errors";

type RouteParams = { organisation: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;
  const orgId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisation);
  if (!orgId) {
    return serviceErrorResponse(
      new PeopleServiceError(404, "Organisation not found", "not_found"),
      "people",
    );
  }

  const membership = ctx.tenantRoles.organisations.find(
    (o) => o.organisationId === orgId,
  );
  if (!membership) {
    return serviceErrorResponse(
      new PeopleServiceError(403, "Forbidden", "forbidden"),
      "people",
    );
  }

  try {
    const employee = await peopleService.getEmployee(ctx, {
      organisationSlug: organisation,
      userOrganisationId: membership.membershipId,
    });
    return jsonDataResponse({ employee });
  } catch (error) {
    return serviceErrorResponse(error, "people");
  }
}
