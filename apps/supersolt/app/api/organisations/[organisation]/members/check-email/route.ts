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

type PostBody = {
  email?: string;
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
            "Checking members requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL to be configured.",
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
  if (!email) {
    return NextResponse.json(
      { data: null, error: { message: "email is required", status: 400 } },
      { status: 400 }
    );
  }

  try {
    const data = await organisationMembersService.checkMemberEmail(supabase, admin, {
      organisationSlug: organisation,
      actorUserId: userId,
      email,
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
