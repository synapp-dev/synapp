/**
 * OpenID helper utilities for Steam authentication
 */

/**
 * Extract SteamID from OpenID Claimed ID
 * Steam's Claimed ID format: http://steamcommunity.com/openid/id/<steamid>
 */
export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/);
  return match?.[1] ?? null;
}

/**
 * Convert SteamID string to SteamID64 (bigint)
 */
export function steamIdToSteamId64(steamId: string): bigint {
  return BigInt(steamId);
}
