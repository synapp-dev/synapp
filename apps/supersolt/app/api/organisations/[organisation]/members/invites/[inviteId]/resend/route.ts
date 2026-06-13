import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { membersInviteService } from "@/server/organisations/organisation-members.service";

type RouteParams = { organisation: string; inviteId: string };

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Server misconfiguration",
          status: 503,
          code: "permissions.internal_error",
        },
      },
      { status: 503 },
    );
  }

  const { organisation, inviteId } = await context.params;
  const origin = new URL(request.url).origin;

  try {
    await membersInviteService.resendInvite(ctx, admin, {
      organisationSlug: organisation,
      inviteId,
      redirectTo: `${origin}/auth/callback`,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
