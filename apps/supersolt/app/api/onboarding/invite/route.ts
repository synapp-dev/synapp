import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import {
  getOnboardingState,
  resolvePlatformRoleIdForSlug,
} from "@/server/onboarding/onboarding.service";

type Body = {
  email?: string;
  roleSlug?: string;
};

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { data: null, error: { message: "Unauthorized", status: 401 } },
      { status: 401 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({
      data: {
        invited: false,
        skipped: true,
        reason:
          "SUPABASE_SERVICE_ROLE_KEY is not set; team invites from setup are disabled.",
      },
      error: null,
    });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { data: null, error: { message: "Invalid JSON", status: 400 } },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email?.includes("@")) {
    return NextResponse.json(
      { data: null, error: { message: "Valid email is required", status: 400 } },
      { status: 400 }
    );
  }

  const state = await getOnboardingState(supabase, user.id);
  if (state.completed) {
    return NextResponse.json(
      { data: null, error: { message: "Setup already completed", status: 400 } },
      { status: 400 }
    );
  }
  if (!state.organisation) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Complete business details first", status: 400 },
      },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return NextResponse.json(
      { data: null, error: { message: "Server misconfiguration", status: 500 } },
      { status: 500 }
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const origin = new URL(request.url).origin;
  const roleId = resolvePlatformRoleIdForSlug(body.roleSlug ?? "crew");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${origin}/auth`,
    data: {
      invited_organisation_id: state.organisation.id,
      invited_organisation_slug: state.organisation.slug,
      invited_role_id: roleId,
    },
  });

  if (error) {
    return NextResponse.json(
      { data: null, error: { message: error.message, status: 400 } },
      { status: 400 }
    );
  }

  return NextResponse.json({
    data: {
      invited: true,
      userId: data.user?.id ?? null,
    },
    error: null,
  });
}
