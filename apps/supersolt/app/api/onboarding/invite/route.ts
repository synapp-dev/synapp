import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { createSupabaseAdmin } from "@/utils/supabase/admin";
import { getOnboardingState } from "@/server/onboarding/onboarding.service";
import { membersInviteService } from "@/server/organisations/organisation-members.service";
import { onboardingRepo } from "@/server/onboarding/onboarding.repo";
import { handleMembersRouteError } from "@/lib/api/service-error-response";

type Body = {
  email?: string;
  roleSlug?: string;
};

export async function POST(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const admin = createSupabaseAdmin();
  if (!admin) {
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
      { status: 400 },
    );
  }

  const email = body.email?.trim().toLowerCase();
  if (!email?.includes("@")) {
    return NextResponse.json(
      { data: null, error: { message: "Valid email is required", status: 400 } },
      { status: 400 },
    );
  }

  const state = await getOnboardingState(ctx);
  if (state.completed) {
    return NextResponse.json(
      { data: null, error: { message: "Setup already completed", status: 400 } },
      { status: 400 },
    );
  }
  if (!state.organisation) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Complete business details first", status: 400 },
      },
      { status: 400 },
    );
  }

  const venues = await ctx.appDb.rls((tx) =>
    onboardingRepo.listVenuesForOrganisation(tx, state.organisation!.id),
  );
  const firstVenueId = venues[0]?.id;
  if (!firstVenueId) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Add a venue before inviting team members", status: 400 },
      },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;

  try {
    const result = await membersInviteService.createInvite(ctx, admin, {
      organisationSlug: state.organisation.slug,
      email,
      roleSlug: body.roleSlug ?? "crew",
      venueIds: [firstVenueId],
      redirectTo: `${origin}/auth/callback`,
    });
    return NextResponse.json({
      data: {
        invited: true,
        inviteId: result.inviteId,
      },
      error: null,
    });
  } catch (error) {
    return handleMembersRouteError(error);
  }
}
