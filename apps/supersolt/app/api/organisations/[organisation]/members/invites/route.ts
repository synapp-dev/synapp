import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { handleMembersRouteError } from "@/lib/api/service-error-response";
import { membersInviteService } from "@/server/organisations/organisation-members.service";

type RouteParams = { organisation: string };

type PostBody = {
  email?: string;
  roleSlug?: string;
  venueIds?: string[];
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

  const { organisation } = await context.params;
  const origin = new URL(request.url).origin;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Invalid JSON", status: 400, code: "permissions.internal_error" },
      },
      { status: 400 },
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "";
  const venueIds = Array.isArray(body.venueIds)
    ? body.venueIds.filter((v): v is string => typeof v === "string")
    : [];

  if (!email || !roleSlug || venueIds.length === 0) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "email, roleSlug, and venueIds are required",
          status: 400,
          code: "permissions.invalid_venues",
        },
      },
      { status: 400 },
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
