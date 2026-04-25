import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import {
  organisationMembersService,
  OrganisationMembersServiceError,
} from "@/server/organisations/organisation-members.service";

type RouteParams = {
  organisation: string;
};

async function getSessionUserId() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, userId: null as string | null };
  }

  return { supabase, userId: user.id };
}

export async function GET(
  _request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation } = await context.params;

  try {
    const data = await organisationMembersService.listMembers(supabase, {
      organisationSlug: organisation,
      actorUserId: userId,
    });
    return NextResponse.json({ data, error: null });
  } catch (error) {
    if (error instanceof OrganisationMembersServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

type PatchBody = {
  userOrganisationId?: string;
  roleSlug?: string;
};

export async function PATCH(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const { organisation } = await context.params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  const userOrganisationId =
    typeof body.userOrganisationId === "string"
      ? body.userOrganisationId.trim()
      : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "";

  if (!userOrganisationId || !roleSlug) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "userOrganisationId and roleSlug are required",
          status: 400,
        },
      },
      { status: 400 }
    );
  }

  try {
    await organisationMembersService.updateMemberRole(supabase, {
      organisationSlug: organisation,
      actorUserId: userId,
      userOrganisationId,
      roleSlug,
    });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (error) {
    if (error instanceof OrganisationMembersServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}

type PostBody = {
  email?: string;
  roleSlug?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<RouteParams> }
) {
  const { supabase, userId } = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            "Adding members requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL to be configured.",
          status: 503,
        },
      },
      { status: 503 }
    );
  }

  const { organisation } = await context.params;

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const roleSlug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "";

  if (!email || !roleSlug) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "email and roleSlug are required", status: 400 },
      },
      { status: 400 }
    );
  }

  try {
    await organisationMembersService.addMember(supabase, admin, {
      organisationSlug: organisation,
      actorUserId: userId,
      email,
      roleSlug,
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (error) {
    if (error instanceof OrganisationMembersServiceError) {
      return NextResponse.json(
        { data: null, error: { message: error.message, status: error.status } },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { data: null, error: { message: "Internal server error", status: 500 } },
      { status: 500 }
    );
  }
}
