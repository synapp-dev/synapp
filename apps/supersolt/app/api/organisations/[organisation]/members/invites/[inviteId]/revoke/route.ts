
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { membersInviteService } from "@/server/organisations/organisation-members.service";

type RouteParams = { organisation: string; inviteId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, inviteId } = await context.params;

  try {
    await membersInviteService.revokeInvite(ctx, {
      organisationSlug: organisation,
      inviteId,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
