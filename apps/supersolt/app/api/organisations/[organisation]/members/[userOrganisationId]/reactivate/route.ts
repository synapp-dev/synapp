import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";

type RouteParams = {
  organisation: string;
  userOrganisationId: string;
};

type Body = {
  venueIds?: string[];
  roleSlug?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, userOrganisationId } = await context.params;

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const venueIds = Array.isArray(body.venueIds)
    ? body.venueIds.filter((v): v is string => typeof v === "string")
    : [];

  if (venueIds.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "venueIds are required to reactivate",
          status: 400,
          code: "permissions.invalid_venues",
        },
      },
      { status: 400 },
    );
  }

  try {
    await organisationMembersService.reactivateMember(ctx, {
      organisationSlug: organisation,
      userOrganisationId,
      venueIds,
      roleSlug: body.roleSlug,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
