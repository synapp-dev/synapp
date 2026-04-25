import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import {
  errorDetailsFromUnknown,
  onboardingLogOrganisationError,
} from "@/server/onboarding/onboarding-route-log";
import { upsertOnboardingOrganisation } from "@/server/onboarding/onboarding.service";

type Body = {
  name?: string;
  abn?: string | null;
  isGstRegistered?: boolean;
  organisationId?: string | null;
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

  const supabaseAdmin = createSupabaseAdmin();
  if (!supabaseAdmin) {
    onboardingLogOrganisationError("admin_client_unavailable", {
      userId: user.id,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    });
    return NextResponse.json(
      {
        data: null,
        error: {
          message:
            "SUPABASE_SERVICE_ROLE_KEY is not set; saving organisation during setup is unavailable.",
          status: 503,
        },
      },
      { status: 503 }
    );
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

  try {
    const organisation = await upsertOnboardingOrganisation(supabaseAdmin, user.id, {
      name: body.name ?? "",
      abn: body.abn,
      isGstRegistered: body.isGstRegistered,
      organisationId: body.organisationId,
    });
    return NextResponse.json({ data: { organisation }, error: null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    onboardingLogOrganisationError("upsert_failed", {
      userId: user.id,
      ...errorDetailsFromUnknown(e),
    });
    return NextResponse.json(
      { data: null, error: { message, status: 400 } },
      { status: 400 }
    );
  }
}
