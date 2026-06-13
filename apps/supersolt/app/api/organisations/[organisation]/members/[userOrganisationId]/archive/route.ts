import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";

type RouteParams = {
  organisation: string;
  userOrganisationId: string;
};

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

  const { organisation, userOrganisationId } = await context.params;

  try {
    await organisationMembersService.archiveMember(ctx, admin, {
      organisationSlug: organisation,
      userOrganisationId,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
