/**
 * Server-only upstream fetchers for player stat sources. Each returns the raw
 * JSON payload (or null on failure) so callers can archive `raw` and parse
 * convenience columns separately.
 *
 * These functions read server secrets (Steam/Faceit keys) and must only be
 * imported from route handlers / server code, never client components.
 */

const FACEIT_BASE = "https://open.faceit.com/data/v4";

/** Resolve a Steam vanity (custom URL) to a steamid64 via the Steam Web API. */
export async function resolveSteamVanity(
  vanity: string,
): Promise<string | null> {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  try {
    const url = new URL(
      "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/",
    );
    url.searchParams.set("key", key);
    url.searchParams.set("vanityurl", vanity);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { success?: number; steamid?: string };
    };
    if (data.response?.success === 1 && data.response.steamid) {
      return data.response.steamid;
    }
    return null;
  } catch {
    return null;
  }
}

function faceitHeaders(): HeadersInit | null {
  const key = process.env.FACEIT_API_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, Accept: "application/json" };
}

/** Fetch a Faceit player by steamid64 (cs2). Returns raw payload or null. */
export async function fetchFaceitBySteamId64(
  steamid64: string,
): Promise<unknown | null> {
  const headers = faceitHeaders();
  if (!headers) return null;
  try {
    const url = new URL(`${FACEIT_BASE}/players`);
    url.searchParams.set("game", "cs2");
    url.searchParams.set("game_player_id", steamid64);
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Fetch a Faceit player by nickname. Returns raw payload or null. */
export async function fetchFaceitByNickname(
  nickname: string,
): Promise<unknown | null> {
  const headers = faceitHeaders();
  if (!headers) return null;
  try {
    const url = new URL(`${FACEIT_BASE}/players`);
    url.searchParams.set("nickname", nickname);
    const res = await fetch(url, { headers, cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Extract steamid64 from a Faceit player payload (`steam_id_64`). */
export function faceitSteamId64(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as Record<string, unknown>).steam_id_64;
  return typeof id === "string" && /^\d{17}$/.test(id) ? id : null;
}

/**
 * Fetch a Leetify profile by steamid64 via the same endpoint the Leetify web
 * app uses (`/api/profile/id/{steamid64}`). Returns the full payload including
 * `games[]` for season rank derivation. The older public v3 endpoint omits
 * `games[]` and only exposes a trimmed `recent_matches` list.
 */
export async function fetchLeetify(steamid64: string): Promise<unknown | null> {
  try {
    const res = await fetch(
      `https://api.cs-prod.leetify.com/api/profile/id/${steamid64}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}
