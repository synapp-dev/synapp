import "server-only";

import { readFile, writeFile } from "node:fs/promises";
import { inArray, eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { steamProfiles, players, userProfiles } from "@/server/db/schema";
import { dp } from "./parser";
import { demoSidecarPath } from "./storage";
import type { DemoPlayerProfile } from "./types";

const isRealSteamId = (v: unknown): boolean => {
  const s = String(v ?? "");
  return s.length > 5 && s !== "0";
};
const lc = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.toLowerCase() : null;
};

/**
 * Resolve the demo's player steamid64s to Steam identity (avatar/name/country):
 * read what's already cached in `steam_profiles`, then batch-fetch the rest from
 * the Steam Web API. The result is cached to a per-demo sidecar — we never write
 * to the shared `steam_profiles`/`players` tables here.
 */
export async function getDemoPlayers(path: string, token: string): Promise<DemoPlayerProfile[]> {
  const file = demoSidecarPath(token, "players.json");
  try {
    const cached = JSON.parse(await readFile(file, "utf8")) as DemoPlayerProfile[];
    // Ignore caches written before the intradark-identity fields existed.
    if (Array.isArray(cached) && (cached.length === 0 || "username" in cached[0]!)) {
      return cached;
    }
  } catch {
    /* not cached yet */
  }

  const info = dp.parsePlayerInfo(path);
  const ids = [...new Set(info.map((p) => String(p.steamid)).filter(isRealSteamId))];
  if (ids.length === 0) return [];

  const byId = new Map<string, DemoPlayerProfile>(
    ids.map((id) => [
      id,
      { steamid64: id, avatar: null, persona: null, country: null, username: null, displayName: null },
    ]),
  );

  // 1) Cached Steam profiles in our DB.
  const steamRows = await db
    .select({
      steamid64: steamProfiles.steamid64,
      avatar: steamProfiles.avatarfull,
      persona: steamProfiles.personaname,
      country: steamProfiles.loccountrycode,
    })
    .from(steamProfiles)
    .where(inArray(steamProfiles.steamid64, ids));
  for (const r of steamRows) {
    const e = byId.get(r.steamid64);
    if (e) {
      e.avatar = r.avatar ?? null;
      e.persona = r.persona ?? null;
      e.country = lc(r.country);
    }
  }

  // 2) Linked intradark members (preferred display name + profile link).
  const memberRows = await db
    .select({
      steamid64: players.steamid64,
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      avatarUrl: userProfiles.avatarUrl,
    })
    .from(players)
    .leftJoin(userProfiles, eq(players.userProfileId, userProfiles.id))
    .where(inArray(players.steamid64, ids));
  for (const r of memberRows) {
    const e = byId.get(r.steamid64);
    if (!e) continue;
    e.username = r.username ?? null;
    e.displayName =
      r.displayName?.trim() ||
      [r.firstName, r.lastName].filter(Boolean).join(" ").trim() ||
      r.username ||
      null;
    if (!e.avatar && r.avatarUrl) e.avatar = r.avatarUrl;
  }

  // 3) Anything still missing an avatar → one batched Steam call (≤100 ids).
  const missing = ids.filter((id) => !byId.get(id)?.avatar);
  const key = process.env.STEAM_API_KEY;
  if (missing.length > 0 && key) {
    for (const s of await fetchSteamSummaries(missing, key)) {
      const e = byId.get(s.steamid64);
      if (e) {
        e.avatar = s.avatar;
        e.persona = s.persona;
        if (!e.country) e.country = s.country;
      }
    }
  }

  const result = ids.map((id) => byId.get(id)!);
  await writeFile(file, JSON.stringify(result)).catch(() => {});
  return result;
}

type SteamSummary = Pick<DemoPlayerProfile, "steamid64" | "avatar" | "persona" | "country">;

async function fetchSteamSummaries(ids: string[], key: string): Promise<SteamSummary[]> {
  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${ids.join(",")}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      response?: { players?: Array<Record<string, unknown>> };
    };
    return (json.response?.players ?? []).map((p) => ({
      steamid64: String(p.steamid),
      avatar: (p.avatarfull as string) ?? null,
      persona: (p.personaname as string) ?? null,
      country: lc(p.loccountrycode),
    }));
  } catch {
    return [];
  }
}
