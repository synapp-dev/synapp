import type { User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type SteamProfileRow = Database["public"]["Tables"]["steam_profiles"]["Row"];

export type CurrentUserProfiles = {
  user: User;
  userProfile: UserProfileRow;
  steamProfile: SteamProfileRow | null;
};

/**
 * Get the current authenticated user and their user_profiles + steam_profiles.
 * Returns null if not logged in or if user_profile is missing.
 */
export async function getCurrentUserProfiles(): Promise<CurrentUserProfiles | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const admin = createAdminClient();

  const { data: userProfile, error: profileError } = await admin
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !userProfile) {
    return null;
  }

  let steamProfile: SteamProfileRow | null = null;
  if (userProfile.steam_profile_id != null) {
    const { data } = await admin
      .from("steam_profiles")
      .select("*")
      .eq("steamid64", userProfile.steam_profile_id)
      .single();
    steamProfile = data ?? null;
  }

  return {
    user,
    userProfile,
    steamProfile,
  };
}
