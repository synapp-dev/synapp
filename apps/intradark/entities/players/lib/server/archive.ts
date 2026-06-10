/**
 * Server-only DB-first archive helpers. Each source helper returns the cached
 * row when it is within its TTL, otherwise fetches upstream, archives, and
 * returns fresh data. Shared by the per-source route handlers and the manual
 * refresh route.
 */

import { createAdminClient } from "@/utils/supabase/admin";
import {
  fetchSteamProfile,
  steamProfileToDbFormat,
} from "@/utils/steam/profile";
import {
  fetchFaceitBySteamId64,
  fetchLeetify,
} from "@/entities/players/lib/server/sources";
import { parseFaceit } from "@/entities/players/lib/parse-faceit";
import {
  parseLeetify,
  normalizeLeetify,
  type LeetifySnapshotColumns,
} from "@/entities/players/lib/parse-leetify";
import {
  ensurePlayer,
  touchPlayerFetched,
} from "@/entities/players/lib/server/registry";
import { normalizeCountryCode } from "@/entities/players/lib/country-code";
import { isStale, SOURCE_TTL_MS } from "@/entities/players/lib/staleness";
import type {
  SteamProfile,
  FaceitProfile,
  LeetifyProfile,
} from "@/entities/players/lib/types";

export interface ArchiveResult<T> {
  cached: boolean;
  data: T | null;
}

type SteamRow = {
  steamid: string;
  personaname: string;
  avatarfull: string | null;
  profileurl: string | null;
  realname: string | null;
  timecreated: string | null;
  lastlogoff: string | null;
};

function deriveVanity(profileurl: string | null | undefined): string | null {
  if (!profileurl) return null;
  const m = profileurl.match(/steamcommunity\.com\/id\/([^/?#]+)/i);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function toSteamProfile(row: SteamRow, steamid64: string): SteamProfile {
  return {
    success: true,
    data: {
      steamid: row.steamid ?? steamid64,
      personaname: row.personaname ?? "",
      avatarfull: row.avatarfull ?? "",
      profileurl: row.profileurl ?? "",
      realname: row.realname ?? undefined,
      timecreated: row.timecreated ? Date.parse(row.timecreated) / 1000 : undefined,
      lastlogoff: row.lastlogoff ? Date.parse(row.lastlogoff) / 1000 : undefined,
      player_level: 0,
      friends_count: 0,
    },
  };
}

export async function archiveSteam(
  steamid64: string,
  opts: { force?: boolean } = {},
): Promise<ArchiveResult<SteamProfile>> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("steam_profiles")
    .select("steamid, personaname, avatarfull, profileurl, realname, timecreated, lastlogoff, updated_at")
    .eq("steamid64", steamid64)
    .maybeSingle();

  if (!opts.force && existing && !isStale(existing.updated_at, SOURCE_TTL_MS.steam)) {
    await ensurePlayer(admin, steamid64);
    return { cached: true, data: toSteamProfile(existing, steamid64) };
  }

  const summary = await fetchSteamProfile(steamid64, process.env.STEAM_API_KEY);
  if (!summary) {
    return existing
      ? { cached: true, data: toSteamProfile(existing, steamid64) }
      : { cached: false, data: null };
  }

  await admin
    .from("steam_profiles")
    .upsert(steamProfileToDbFormat(summary), { onConflict: "steamid64" });

  const countryFromSteam = normalizeCountryCode(summary.loccountrycode);
  let countryFlag: string | undefined;
  if (countryFromSteam) {
    const { data: row } = await admin
      .from("players")
      .select("country_flag")
      .eq("steamid64", steamid64)
      .maybeSingle();
    if (!row?.country_flag) {
      countryFlag = countryFromSteam;
    }
  }

  await ensurePlayer(admin, steamid64, {
    steamVanity: deriveVanity(summary.profileurl),
    ...(countryFlag ? { countryFlag } : {}),
  });
  await touchPlayerFetched(admin, steamid64);

  return {
    cached: false,
    data: toSteamProfile(
      {
        steamid: summary.steamid,
        personaname: summary.personaname,
        avatarfull: summary.avatarfull ?? null,
        profileurl: summary.profileurl ?? null,
        realname: summary.realname ?? null,
        timecreated: summary.timecreated
          ? new Date(summary.timecreated * 1000).toISOString()
          : null,
        lastlogoff: summary.lastlogoff
          ? new Date(summary.lastlogoff * 1000).toISOString()
          : null,
      },
      steamid64,
    ),
  };
}

function toFaceitProfile(raw: unknown): FaceitProfile {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    result: "ok",
    payload: {
      id: String(r.player_id ?? ""),
      nickname: String(r.nickname ?? ""),
      avatar: String(r.avatar ?? ""),
      country: String(r.country ?? ""),
      games: (r.games ?? {}) as FaceitProfile["payload"]["games"],
    },
  };
}

export async function archiveFaceit(
  steamid64: string,
  opts: { force?: boolean } = {},
): Promise<ArchiveResult<FaceitProfile>> {
  const admin = createAdminClient();

  const { data: latest } = await admin
    .from("player_faceit_snapshots")
    .select("raw, fetched_at")
    .eq("steamid64", steamid64)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!opts.force && latest && !isStale(latest.fetched_at, SOURCE_TTL_MS.faceit)) {
    return { cached: true, data: toFaceitProfile(latest.raw) };
  }

  const raw = await fetchFaceitBySteamId64(steamid64);
  if (!raw) {
    return latest
      ? { cached: true, data: toFaceitProfile(latest.raw) }
      : { cached: false, data: null };
  }

  const parsed = parseFaceit(raw);
  await admin.from("player_faceit_snapshots").insert({
    steamid64,
    faceit_elo: parsed.faceit_elo,
    skill_level: parsed.skill_level,
    region: parsed.region,
    nickname: parsed.nickname,
    raw,
  });
  await ensurePlayer(admin, steamid64, {
    faceitNickname: parsed.nickname,
    faceitPlayerId: parsed.faceit_player_id,
    ...(parsed.country ? { countryFlag: parsed.country } : {}),
  });

  return { cached: false, data: toFaceitProfile(raw) };
}

export async function archiveLeetify(
  steamid64: string,
  opts: { force?: boolean } = {},
): Promise<ArchiveResult<LeetifyProfile>> {
  const admin = createAdminClient();

  const { data: latest } = await admin
    .from("player_leetify_snapshots")
    .select("raw, fetched_at, premier_rating, season_ranks")
    .eq("steamid64", steamid64)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const storedColumns: LeetifySnapshotColumns | undefined = latest
    ? {
        premier_rating: latest.premier_rating,
        season_ranks: latest.season_ranks as LeetifySnapshotColumns["season_ranks"],
      }
    : undefined;

  if (!opts.force && latest && !isStale(latest.fetched_at, SOURCE_TTL_MS.leetify)) {
    return {
      cached: true,
      data: normalizeLeetify(latest.raw, storedColumns),
    };
  }

  const raw = await fetchLeetify(steamid64);
  if (!raw) {
    return latest
      ? {
          cached: true,
          data: normalizeLeetify(latest.raw, storedColumns),
        }
      : { cached: false, data: null };
  }

  const parsed = parseLeetify(raw);
  await admin.from("player_leetify_snapshots").insert({
    steamid64,
    leetify_rating: parsed.leetify_rating,
    aim: parsed.aim,
    positioning: parsed.positioning,
    utility: parsed.utility,
    games_played: parsed.games_played,
    premier_rating: parsed.premier_rating,
    season_ranks: parsed.season_ranks,
    raw,
  });
  await ensurePlayer(admin, steamid64);

  return { cached: false, data: normalizeLeetify(raw) };
}
