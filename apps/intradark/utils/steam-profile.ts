import { createBrowserClient } from "@/utils/supabase/client";
import type { Database } from "@/types/supabase";

type SteamProfile = Database["public"]["Tables"]["steam_profiles"]["Row"];
type SteamProfileInsert =
  Database["public"]["Tables"]["steam_profiles"]["Insert"];

interface SteamAPIResponse {
  response: {
    players: Array<{
      steamid: string;
      communityvisibilitystate: number;
      profilestate: number;
      personaname: string;
      profileurl: string;
      avatar: string;
      avatarmedium: string;
      avatarfull: string;
      lastlogoff: number;
      personastate: number;
      commentpermission: number;
      realname?: string;
      primaryclanid?: string;
      timecreated?: number;
      gameid?: string;
      gameserverip?: string;
      gameextrainfo?: string;
      cityid?: number;
      loccountrycode?: string;
      locstatecode?: string;
      loccityid?: number;
    }>;
  };
}

/**
 * Fetch Steam profile data from Steam Web API
 */
export async function fetchSteamProfile(
  steamid64: string
): Promise<SteamAPIResponse["response"]["players"][0] | null> {
  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.NEXT_PUBLIC_STEAM_API_KEY}&steamids=${steamid64}`
    );

    if (!response.ok) {
      throw new Error(`Steam API request failed: ${response.status}`);
    }

    const data: SteamAPIResponse = await response.json();

    if (data.response.players.length === 0) {
      return null;
    }

    return data.response.players[0] || null;
  } catch (error) {
    console.error("Error fetching Steam profile:", error);
    return null;
  }
}

/**
 * Convert Steam API response to database insert format
 */
export function convertSteamAPIResponseToProfile(
  steamData: SteamAPIResponse["response"]["players"][0]
): SteamProfileInsert {
  return {
    steamid64: parseInt(steamData.steamid),
    steamid: steamData.steamid,
    personaname: steamData.personaname,
    profileurl: steamData.profileurl,
    avatar: steamData.avatar,
    avatarmedium: steamData.avatarmedium,
    avatarfull: steamData.avatarfull,
    personastate: steamData.personastate,
    communityvisibilitystate: steamData.communityvisibilitystate,
    profilestate: steamData.profilestate,
    lastlogoff: steamData.lastlogoff
      ? new Date(steamData.lastlogoff * 1000).toISOString()
      : null,
    commentpermission: steamData.commentpermission,
    realname: steamData.realname || null,
    primaryclanid: steamData.primaryclanid
      ? parseInt(steamData.primaryclanid)
      : null,
    timecreated: steamData.timecreated
      ? new Date(steamData.timecreated * 1000).toISOString()
      : null,
    gameid: steamData.gameid ? parseInt(steamData.gameid) : null,
    gameserverip: steamData.gameserverip || null,
    gameextrainfo: steamData.gameextrainfo || null,
    cityid: steamData.cityid || null,
    loccountrycode: steamData.loccountrycode || null,
    locstatecode: steamData.locstatecode || null,
    loccityid: steamData.loccityid || null,
  };
}

/**
 * Get or create Steam profile in database
 */
export async function getOrCreateSteamProfile(
  steamid64: string
): Promise<SteamProfile | null> {
  const supabase = await createBrowserClient();

  try {
    // First, try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
      .from("steam_profiles")
      .select("*")
      .eq("steamid64", parseInt(steamid64))
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected if profile doesn't exist
      throw fetchError;
    }

    if (existingProfile) {
      return existingProfile;
    }

    // Profile doesn't exist, fetch from Steam API
    const steamData = await fetchSteamProfile(steamid64);
    if (!steamData) {
      return null;
    }

    // Convert and insert the profile
    const profileData = convertSteamAPIResponseToProfile(steamData);
    const { data: newProfile, error: insertError } = await supabase
      .from("steam_profiles")
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return newProfile;
  } catch (error) {
    console.error("Error getting or creating Steam profile:", error);
    return null;
  }
}

/**
 * Update existing Steam profile with fresh data from Steam API
 */
export async function updateSteamProfile(
  steamid64: string
): Promise<SteamProfile | null> {
  const supabase = await createBrowserClient();

  try {
    const steamData = await fetchSteamProfile(steamid64);
    if (!steamData) {
      return null;
    }

    const profileData = convertSteamAPIResponseToProfile(steamData);

    const { data: updatedProfile, error } = await supabase
      .from("steam_profiles")
      .update(profileData)
      .eq("steamid64", parseInt(steamid64))
      .select()
      .single();

    if (error) {
      throw error;
    }

    return updatedProfile;
  } catch (error) {
    console.error("Error updating Steam profile:", error);
    return null;
  }
}

/**
 * Link Steam profile to current user
 */
export async function linkSteamProfileToUser(
  steamid64: string
): Promise<boolean> {
  const supabase = await createBrowserClient();

  try {
    const { data, error } = await supabase.rpc("link_steam_profile_to_user", {
      p_steamid64: parseInt(steamid64),
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error linking Steam profile to user:", error);
    return false;
  }
}

/**
 * Unlink Steam profile from current user
 */
export async function unlinkSteamProfileFromUser(): Promise<boolean> {
  const supabase = await createBrowserClient();

  try {
    const { data, error } = await supabase.rpc(
      "unlink_steam_profile_from_user"
    );

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error unlinking Steam profile from user:", error);
    return false;
  }
}

/**
 * Get user profile with Steam data
 */
export async function getUserProfileWithSteam() {
  const supabase = await createBrowserClient();

  try {
    const { data, error } = await supabase.rpc("get_user_profile_with_steam");

    if (error) {
      throw error;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Error getting user profile with Steam data:", error);
    return null;
  }
}

/**
 * Search users by Steam persona name
 */
export async function searchUsersBySteamName(searchTerm: string) {
  const supabase = await createBrowserClient();

  try {
    const { data, error } = await supabase.rpc("search_users_by_steam_name", {
      p_search_term: searchTerm,
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error searching users by Steam name:", error);
    return [];
  }
}
