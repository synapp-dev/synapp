import { normalizeLeetify } from "@/entities/players/lib/parse-leetify";
import type {
  LegitimacyGameEntry,
  LegitimacyInput,
} from "@/entities/players/lib/legitimacy/types";

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function parseGamesFromLeetifyRaw(raw: unknown): LegitimacyGameEntry[] {
  const games = asRecord(raw).games;
  if (!Array.isArray(games)) return [];
  return games.slice(0, 30).map((g) => {
    const row = asRecord(g);
    const ratings = asRecord(row.ratings ?? row.recentGameRatings);
    return {
      finishedAt:
        (row.gameFinishedAt as string | number | undefined) ??
        (row.finished_at as string | number | undefined) ??
        null,
      leetifyRating:
        typeof ratings.leetify === "number"
          ? ratings.leetify
          : typeof row.leetifyRating === "number"
            ? row.leetifyRating
            : null,
      hasBannedPlayer: row.hasBannedPlayer === true,
      partySize:
        typeof row.partySize === "number"
          ? row.partySize
          : typeof row.party_size === "number"
            ? row.party_size
            : null,
    };
  });
}

export interface LegitimacySourceRows {
  steam: {
    timecreated: string | null;
    communityvisibilitystate: number | null;
    realname: string | null;
    avatarfull: string | null;
    vac_banned: boolean | null;
    game_banned: boolean | null;
    community_banned: boolean | null;
    economy_ban: string | null;
    ban_age_days: number | null;
    cs2_playtime_minutes: number | null;
    badge_count: number | null;
    steam_level: number | null;
    friends_count: number | null;
  } | null;
  leetify: {
    raw: unknown;
    leetify_rating: number | null;
    aim: number | null;
    positioning: number | null;
    utility: number | null;
    games_played: number | null;
    premier_rating: number | null;
  } | null;
  faceit: {
    raw: unknown;
    faceit_elo: number | null;
    skill_level: number | null;
  } | null;
  gc: {
    vac_banned: boolean | null;
    player_level: number | null;
  } | null;
  platform: {
    discord_user_id: string | null;
    is_verified: boolean | null;
  } | null;
  anticheat: {
    /** Count of admin-confirmed ac_flags for this player's account. */
    confirmedDetections: number;
  } | null;
}

export function buildLegitimacyInput(
  steamid64: string,
  rows: LegitimacySourceRows,
): LegitimacyInput {
  const steam = rows.steam;
  const leetifyRow = rows.leetify;
  const faceitRow = rows.faceit;
  const gc = rows.gc;
  const platform = rows.platform;

  const leetifyView =
    leetifyRow?.raw != null
      ? normalizeLeetify(leetifyRow.raw, {
          premier_rating: leetifyRow.premier_rating,
        })
      : null;

  const faceitGames = faceitRow?.raw
    ? asRecord(asRecord(faceitRow.raw).games)
    : {};
  const faceitCs2 = asRecord(faceitGames.cs2 ?? faceitGames.csgo);

  return {
    steamid64,
    accountCreatedAt: steam?.timecreated ?? null,
    communityVisibility: steam?.communityvisibilitystate ?? null,
    steamLevel: steam?.steam_level ?? null,
    friendsCount: steam?.friends_count ?? null,
    realname: steam?.realname ?? null,
    hasCustomAvatar: !!steam?.avatarfull,
    vacBanned: steam?.vac_banned ?? null,
    gameBanned: steam?.game_banned ?? null,
    communityBanned: steam?.community_banned ?? null,
    economyBan: steam?.economy_ban ?? null,
    banAgeDays: steam?.ban_age_days ?? null,
    cs2PlaytimeMinutes: steam?.cs2_playtime_minutes ?? null,
    badgeCount: steam?.badge_count ?? null,
    gcVacBanned: gc?.vac_banned ?? null,
    leetifyRating: leetifyRow?.leetify_rating ?? null,
    aim: leetifyRow?.aim ?? leetifyView?.aim ?? null,
    positioning: leetifyRow?.positioning ?? leetifyView?.positioning ?? null,
    utility: leetifyRow?.utility ?? leetifyView?.utility ?? null,
    opening: leetifyView?.opening ?? null,
    clutch: leetifyView?.clutch ?? null,
    gamesPlayed: leetifyRow?.games_played ?? leetifyView?.matches ?? null,
    premierRating:
      leetifyRow?.premier_rating ?? leetifyView?.premierRating ?? null,
    games: leetifyRow?.raw ? parseGamesFromLeetifyRaw(leetifyRow.raw) : [],
    hasLeetify: leetifyRow != null,
    faceitElo:
      faceitRow?.faceit_elo ??
      (typeof faceitCs2.faceit_elo === "number" ? faceitCs2.faceit_elo : null),
    faceitLevel:
      faceitRow?.skill_level ??
      (typeof faceitCs2.skill_level === "number" ? faceitCs2.skill_level : null),
    hasFaceit: faceitRow != null,
    discordLinked: !!platform?.discord_user_id,
    emailVerified: platform?.is_verified === true,
    hasGc: gc != null,
    gcPlayerLevel: gc?.player_level ?? null,
    acConfirmedDetections: rows.anticheat?.confirmedDetections ?? null,
  };
}
