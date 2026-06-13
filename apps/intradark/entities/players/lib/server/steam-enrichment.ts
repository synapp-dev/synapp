/**
 * Steam Web API enrichment for legitimacy scoring (bans, hours, level, friends).
 * Server-only — requires STEAM_API_KEY.
 */

const CS2_APP_ID = 730;

export interface SteamEnrichment {
  vacBanned: boolean | null;
  gameBanned: boolean | null;
  communityBanned: boolean | null;
  economyBan: string | null;
  banAgeDays: number | null;
  cs2PlaytimeMinutes: number | null;
  badgeCount: number | null;
  steamLevel: number | null;
  friendsCount: number | null;
}

export async function fetchSteamEnrichment(
  steamid64: string,
  apiKey: string | undefined,
  communityVisibility: number | undefined,
): Promise<SteamEnrichment | null> {
  if (!apiKey) return null;

  const [bans, owned, level, friends] = await Promise.all([
    fetchPlayerBans(steamid64, apiKey),
    fetchCs2Playtime(steamid64, apiKey),
    fetchSteamLevel(steamid64, apiKey),
    communityVisibility === 3
      ? fetchFriendCount(steamid64, apiKey)
      : Promise.resolve(null),
  ]);

  return {
    vacBanned: bans?.vacBanned ?? null,
    gameBanned: bans?.gameBanned ?? null,
    communityBanned: bans?.communityBanned ?? null,
    economyBan: bans?.economyBan ?? null,
    banAgeDays: bans?.banAgeDays ?? null,
    cs2PlaytimeMinutes: owned,
    badgeCount: level?.badgeCount ?? null,
    steamLevel: level?.playerLevel ?? null,
    friendsCount: friends,
  };
}

async function fetchPlayerBans(
  steamid64: string,
  apiKey: string,
): Promise<{
  vacBanned: boolean;
  gameBanned: boolean;
  communityBanned: boolean;
  economyBan: string;
  banAgeDays: number | null;
} | null> {
  try {
    const url = new URL(
      "https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamids", steamid64);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      players?: Array<{
        VACBanned?: boolean;
        NumberOfGameBans?: number;
        CommunityBanned?: boolean;
        EconomyBan?: string;
        DaysSinceLastBan?: number;
      }>;
    };
    const p = data.players?.[0];
    if (!p) return null;
    return {
      vacBanned: !!p.VACBanned,
      gameBanned: (p.NumberOfGameBans ?? 0) > 0,
      communityBanned: !!p.CommunityBanned,
      economyBan: p.EconomyBan ?? "none",
      banAgeDays: p.DaysSinceLastBan ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchCs2Playtime(
  steamid64: string,
  apiKey: string,
): Promise<number | null> {
  try {
    const url = new URL(
      "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamid", steamid64);
    url.searchParams.set("include_appinfo", "0");
    url.searchParams.set("include_played_free_games", "1");
    url.searchParams.set("appids_filter[0]", String(CS2_APP_ID));
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { games?: Array<{ playtime_forever?: number }> };
    };
    const minutes = data.response?.games?.[0]?.playtime_forever;
    return typeof minutes === "number" ? minutes : null;
  } catch {
    return null;
  }
}

async function fetchSteamLevel(
  steamid64: string,
  apiKey: string,
): Promise<{ playerLevel: number; badgeCount: number } | null> {
  try {
    const url = new URL(
      "https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamid", steamid64);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      response?: { player_level?: number };
    };
    const playerLevel = data.response?.player_level;
    if (typeof playerLevel !== "number") return null;

    const badgesUrl = new URL(
      "https://api.steampowered.com/IPlayerService/GetBadges/v1/",
    );
    badgesUrl.searchParams.set("key", apiKey);
    badgesUrl.searchParams.set("steamid", steamid64);
    const badgesRes = await fetch(badgesUrl, { cache: "no-store" });
    let badgeCount = 0;
    if (badgesRes.ok) {
      const badgesData = (await badgesRes.json()) as {
        response?: { badges?: unknown[] };
      };
      badgeCount = badgesData.response?.badges?.length ?? 0;
    }

    return { playerLevel, badgeCount };
  } catch {
    return null;
  }
}

async function fetchFriendCount(
  steamid64: string,
  apiKey: string,
): Promise<number | null> {
  try {
    const url = new URL(
      "https://api.steampowered.com/ISteamUser/GetFriendList/v1/",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamid", steamid64);
    url.searchParams.set("relationship", "friend");
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      friendslist?: { friends?: unknown[] };
    };
    return data.friendslist?.friends?.length ?? 0;
  } catch {
    return null;
  }
}
