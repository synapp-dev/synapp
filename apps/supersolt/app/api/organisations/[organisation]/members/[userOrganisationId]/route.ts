import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { organisationMembersService } from "@/server/organisations/organisation-members.service";

type RouteParams = {
  organisation: string;
  userOrganisationId: string;
};

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, userOrganisationId } = await context.params;

  try {
    const data = await organisationMembersService.getMember(ctx, {
      organisationSlug: organisation,
      userOrganisationId,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return handleMembersRouteError(error);
  }
}

type PatchBody = {
  roleSlug?: string;
  venueIds?: string[];
  firstName?: string;
  lastName?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation, userOrganisationId } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Invalid JSON", status: 400, code: "permissions.internal_error" },
      },
      { status: 400 },
    );
  }

  try {
    await organisationMembersService.updateMember(ctx, {
      organisationSlug: organisation,
      userOrganisationId,
      roleSlug: body.roleSlug,
      venueIds: body.venueIds,
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return jsonDataResponse({ ok: true });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
