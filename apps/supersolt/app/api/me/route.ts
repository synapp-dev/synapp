import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import type { MeUser } from "@/entities/me/model/store";

type UserProfileRow = {
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  setup_completed_at: string | null;
};

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Unauthorized",
          status: 401,
        },
      },
      { status: 401 }
    );
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Confirm your email before continuing.",
          status: 403,
          code: "email_not_confirmed",
        },
      },
      { status: 403 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("email, first_name, last_name, full_name, avatar_url, setup_completed_at")
    .eq("id", user.id)
    .eq("is_active", true)
    .is("archived_at", null)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: profileError.message,
          status: 500,
        },
      },
      { status: 500 }
    );
  }

  const typedProfile = (profile as UserProfileRow | null) ?? null;
  const firstName = typedProfile?.first_name ?? null;
  const lastName = typedProfile?.last_name ?? null;
  const profileFullName = typedProfile?.full_name ?? null;
  const computedFullName =
    [firstName, lastName].filter((part) => Boolean(part)).join(" ").trim() ||
    profileFullName ||
    null;

  const setupCompletedAt = typedProfile?.setup_completed_at ?? null;
  const needsSetup = !setupCompletedAt;

  const me: MeUser = {
    id: user.id,
    email: typedProfile?.email ?? user.email ?? null,
    firstName,
    lastName,
    fullName:
      computedFullName ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null),
    avatarUrl:
      typedProfile?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null),
    role:
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null,
    features: [],
    needsSetup,
    setupCompletedAt,
  };

  return NextResponse.json({ data: me, error: null });
}
