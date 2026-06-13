import { NextResponse } from "next/server";
import { requireRequestAuth } from "@/lib/api/route-auth";
import { jsonDataResponse } from "@/lib/api/service-error-response";
import { getMeUser } from "@/server/me/me.service";
import { membersInviteService } from "@/server/organisations/organisation-members.service";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { ctx, errorResponse } = await requireRequestAuth(request);
  if (errorResponse) {
    return errorResponse;
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        data: null,
        error: { message: "Unauthorized", status: 401 },
      },
      { status: 401 },
    );
  }

  const me = await getMeUser(ctx, {
    email: user.email ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    userMetadata: user.user_metadata,
    appRole:
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null,
  });

  if ("code" in me && me.code === "email_not_confirmed") {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Confirm your email before continuing.",
          status: 403,
          code: "email_not_confirmed",
        },
      },
      { status: 403 },
    );
  }

  if (user.email) {
    try {
      await membersInviteService.acceptPendingInvitesForUser(ctx, {
        email: user.email,
      });
    } catch {
      // Non-fatal — user may already have memberships
    }
  }

  return jsonDataResponse(me);
}
