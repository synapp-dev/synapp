import { requireRequestAuth } from "@/lib/api/route-auth";
import {
  handleMembersRouteError,
  jsonDataResponse,
  validationErrorResponse,
} from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import {
  organisationMembersService,
  membersInviteService,
} from "@/server/organisations/organisation-members.service";

type RouteParams = { organisation: string };

export async function GET(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const { organisation } = await context.params;

  try {
    const data = await organisationMembersService.listMembers(ctx, {
      organisationSlug: organisation,
    });
    return jsonDataResponse(data);
  } catch (error) {
    return handleMembersRouteError(error);
  }
}

type PostBody = {
  email?: string;
  roleSlug?: string;
  venueIds?: string[];
  firstName?: string;
  lastName?: string;
};

/** Creates a pending invite (replaces immediate membership creation). */
export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> },
) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) return errorResponse;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return validationErrorResponse(
      "Invites require SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.",
      503,
      "permissions.internal_error",
    );
  }

  const { organisation } = await context.params;
  const origin = new URL(request.url).origin;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return validationErrorResponse("Invalid JSON", 400, "permissions.internal_error");
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "";
  const venueIds = Array.isArray(body.venueIds)
    ? body.venueIds.filter((v): v is string => typeof v === "string")
    : [];

  if (!email || !roleSlug || venueIds.length === 0) {
    return validationErrorResponse(
      "email, roleSlug, and venueIds are required",
      400,
      "permissions.invalid_venues",
    );
  }

  try {
    const result = await membersInviteService.createInvite(ctx, admin, {
      organisationSlug: organisation,
      email,
      roleSlug,
      venueIds,
      redirectTo: `${origin}/auth/callback`,
    });
    return jsonDataResponse(result);
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
