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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:43',message:'fetchSteamProfile entry',data:{steamId64,hasApiKey:!!apiKey,apiKeyLength:apiKey?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Steam Web API endpoint for GetPlayerSummaries
    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/");
    url.searchParams.set("steamids", steamId64);
    if (apiKey) {
      url.searchParams.set("key", apiKey);
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:52',message:'URL constructed',data:{url:url.toString(),steamids:url.searchParams.get('steamids'),hasKey:url.searchParams.has('key')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    const response = await fetch(url.toString());
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:56',message:'Response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    if (!response.ok) {
      // Read error response body before returning
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = 'Unable to read response body';
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:63',message:'Steam API error response body',data:{status:response.status,statusText:response.statusText,body:errorText.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.error(`Steam API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: SteamPlayerSummariesResponse = await response.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:68',message:'Response parsed',data:{hasResponse:!!data.response,playersCount:data.response?.players?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!data.response?.players || data.response.players.length === 0) {
      return null;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:74',message:'fetchSteamProfile success',data:{steamid:data.response.players[0].steamid,personaname:data.response.players[0].personaname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    return data.response.players[0];
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc743fdb-5dfa-4224-97c2-690d55b78495',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'utils/steam/profile.ts:78',message:'fetchSteamProfile exception',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
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
  const steamId64 = BigInt(player.steamid);
  
  return {
    steamid64: Number(steamId64),
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
    gameid: player.gameid || null,
    gameserverip: player.gameserverip || null,
    gameextrainfo: player.gameextrainfo || null,
    cityid: player.cityid || null,
    loccountrycode: player.loccountrycode || null,
    locstatecode: player.locstatecode || null,
    loccityid: player.loccityid || null,
  };
}
