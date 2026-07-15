import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import type { Tables } from "@/types/supabase";

type SupabaseServer = Awaited<ReturnType<typeof createServerClient>>;

type AuthedContext = {
  supabase: SupabaseServer;
  userId: string;
  profile: Tables<"profiles">;
  orgId: string;
};

export function apiError(message: string, status: number) {
  return NextResponse.json({ data: null, error: { message, status } }, { status });
}

/**
 * Resolves the caller's session and org membership. Returns a NextResponse
 * (401/403) when the caller is unauthenticated or not attached to an org yet.
 */
export async function requireOrgContext(): Promise<AuthedContext | NextResponse> {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return apiError("Unauthorized", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return apiError("Profile not found", 403);
  }

  if (!profile.org_id) {
    return apiError("Your account is not attached to an organisation yet", 403);
  }

  return { supabase, userId: user.id, profile, orgId: profile.org_id };
}
