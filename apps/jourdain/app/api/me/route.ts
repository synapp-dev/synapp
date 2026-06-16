import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import type { MeUser } from "@/entities/me/model/store";

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

  const me: MeUser = {
    id: user.id,
    email: user.email ?? null,
    fullName:
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null) ??
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null),
    avatarUrl:
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null,
    role:
      typeof user.app_metadata?.role === "string" ? user.app_metadata.role : null,
    sex:
      user.user_metadata?.sex === "male" || user.user_metadata?.sex === "female"
        ? user.user_metadata.sex
        : null,
    features: [],
  };

  return NextResponse.json({ data: me, error: null });
}
