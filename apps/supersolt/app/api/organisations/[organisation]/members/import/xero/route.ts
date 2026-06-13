
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { membersImportXeroService } from "@/server/organisations/members-import-xero.service";

type RouteParams = { organisation: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;

  try {
    const data = await membersImportXeroService.listEmployees(ctx, {
      organisationSlug: organisation,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
