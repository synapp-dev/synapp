import { NextResponse } from "next/server";

import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";
import { createServerClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role_slugs = await getEffectiveRoleSlugsForUser(user.id);

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("username, email, display_name, avatar_url")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return NextResponse.json(
      {
        username: null,
        email: user.email ?? null,
        display_name: null,
        avatar_url: null,
        role_slugs: [...role_slugs],
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    username: profile.username ?? null,
    email: profile.email ?? user.email ?? null,
    display_name: profile.display_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    role_slugs: [...role_slugs],
  });
}
