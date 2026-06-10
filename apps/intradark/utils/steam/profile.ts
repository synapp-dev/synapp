/**
 * Steam profile fetching utilities
 */

import type { Database } from "@/types/supabase";

export interface SteamPlayerSummary {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  profilestate: number;
  lastlogoff?: number;
  commentpermission?: number;
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
}

export interface SteamPlayerSummariesResponse {
  response: {
    players: SteamPlayerSummary[];
  };
}

/**
 * Fetch Steam player summary from Steam Web API
 * @param steamId64 - The SteamID64 as a string
 * @param apiKey - Optional Steam Web API key (not required for basic profile data)
 * @returns Steam player summary or null if not found
 */
export async function fetchSteamProfile(
  steamId64: string,
  apiKey?: string
): Promise<SteamPlayerSummary | null> {
  try {
    // Steam Web API endpoint for GetPlayerSummaries
    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
    url.searchParams.set("steamids", steamId64);
    if (apiKey) {
      url.searchParams.set("key", apiKey);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error(`Steam API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: SteamPlayerSummariesResponse = await response.json();

    if (!data.response?.players || data.response.players.length === 0) {
      return null;
    }

    const playerSummary = data.response.players[0];
    if (!playerSummary) {
      return null;
    }

    return playerSummary;
  } catch (error) {
    console.error("Error fetching Steam profile:", error);
    return null;
  }
}

/**
 * Convert Steam player summary to database insert format
 */
export function steamProfileToDbFormat(
  player: SteamPlayerSummary
): Database["public"]["Tables"]["steam_profiles"]["Insert"] {
  // SteamID64 exceeds Number.MAX_SAFE_INTEGER, so it must stay a string end to
  // end. `player.steamid` is the authoritative string id from the Steam Web API.
  return {
    steamid64: player.steamid,
    steamid: player.steamid,
    personaname: player.personaname,
    profileurl: player.profileurl || null,
    avatar: player.avatar || null,
    avatarmedium: player.avatarmedium || null,
    avatarfull: player.avatarfull || null,
    personastate: player.personastate,
    communityvisibilitystate: player.communityvisibilitystate,
    profilestate: player.profilestate,
    lastlogoff: player.lastlogoff ? new Date(player.lastlogoff * 1000).toISOString() : null,
    commentpermission: player.commentpermission ?? 0,
    realname: player.realname || null,
    primaryclanid: player.primaryclanid ? BigInt(player.primaryclanid).toString() : null,
    timecreated: player.timecreated ? new Date(player.timecreated * 1000).toISOString() : null,
    gameid: player.gameid ? Number(player.gameid) : null,
    gameserverip: player.gameserverip || null,
    gameextrainfo: player.gameextrainfo || null,
    cityid: player.cityid || null,
    loccountrycode: player.loccountrycode || null,
    locstatecode: player.locstatecode || null,
    loccityid: player.loccityid || null,
  };
}
