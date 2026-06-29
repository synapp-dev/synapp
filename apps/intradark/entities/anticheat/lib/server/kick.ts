import "server-only";

import { and, eq, inArray, desc } from "drizzle-orm";

import { AC_INMATCH_KICK_S } from "@/lib/ac/constants";
import { insertAcEvent } from "@/lib/ac/events";
import { isAcGateEnabled } from "@/lib/ac/gate";
import { getRconPasswordFromEnv } from "@/entities/redline/lib/rcon-secret";
import { rconExec } from "@/entities/redline/lib/rcon";
import { db } from "@/server/db/drizzle";
import {
  acSessions,
  gameServers,
  matchPlayers,
  matches,
} from "@/server/db/schema";

/**
 * In-match enforcement (§Q2/Q5): kick a player from the live CS2 server if their AC
 * heartbeat has gone silent for longer than AC_INMATCH_KICK_S (90s). Surgical — the
 * match continues 5v4 (MatchZy pauses); the player re-attests in the client and
 * reconnects. NEVER cancels the match.
 *
 * VAC SAFETY: this is a server-side RCON command to OUR game server — it does not
 * touch the player's machine or the cs2.exe process.
 *
 * Behind AC_GATE_ENABLED and dependent on the P4 server-provisioning layer (live
 * matches with a `game_servers` row + RCON). A no-op until both are in place.
 */

/** Parse a CS2 `status` block into steamid64 → in-game userid. */
export function parseStatusUserIds(statusOutput: string): Map<string, string> {
  const map = new Map<string, string>();
  // MatchZy/CS2 `status` lines look like:
  //   "Name" 3 [U:1:12345678] ... or  # userid "name" 76561198...
  // Match a userid (leading int) near a SteamID (classic [U:1:n] or steam64).
  const lineRe = /^#?\s*(\d+)\s+.*?(\[U:1:\d+\]|7656\d{13})/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(statusOutput)) !== null) {
    const userid = m[1];
    const idRaw = m[2];
    if (!userid || !idRaw) continue;
    const steam64 = idRaw.startsWith("[U:1:")
      ? steamId3ToSteam64(idRaw)
      : idRaw;
    if (steam64) map.set(steam64, userid);
  }
  return map;
}

/** Convert `[U:1:account]` → SteamID64 string. */
function steamId3ToSteam64(id3: string): string | null {
  const m = /\[U:1:(\d+)\]/.exec(id3);
  if (!m || !m[1]) return null;
  const account = BigInt(m[1]);
  return (account + 76561197960265728n).toString();
}

type LiveMatch = {
  matchId: string;
  host: string | null;
  port: number | null;
};

async function liveMatchesWithServers(): Promise<LiveMatch[]> {
  return db
    .select({
      matchId: matches.id,
      host: gameServers.host,
      port: gameServers.port,
    })
    .from(matches)
    .leftJoin(gameServers, eq(gameServers.id, matches.serverId))
    .where(eq(matches.status, "live"));
}

/**
 * For one live match, find rostered players whose AC session is stale (or absent)
 * and RCON-kick them. Records a `kicked` ac_event per kick. Returns kicked steamids.
 */
export async function kickStaleAcPlayers(match: LiveMatch): Promise<string[]> {
  if (!match.host || !match.port) return []; // server not provisioned yet
  const password = getRconPasswordFromEnv();
  if (!password) return [];

  const cutoff = new Date(Date.now() - AC_INMATCH_KICK_S * 1000).toISOString();

  // Rostered steamids for this match.
  const roster = await db
    .select({ steamid64: matchPlayers.steamid64 })
    .from(matchPlayers)
    .where(eq(matchPlayers.matchId, match.matchId));
  if (roster.length === 0) return [];
  const steamids = roster.map((r) => r.steamid64);

  // Latest active session per steamid; stale = last heartbeat older than cutoff
  // (or never). Grab the freshest session row per player.
  const sessions = await db
    .select({
      steamid64: acSessions.steamid64,
      userId: acSessions.userId,
      lastHeartbeatAt: acSessions.lastHeartbeatAt,
    })
    .from(acSessions)
    .where(
      and(
        inArray(acSessions.steamid64, steamids),
        eq(acSessions.status, "active"),
      ),
    )
    .orderBy(desc(acSessions.lastHeartbeatAt));

  const freshest = new Map<string, { userId: string; last: string | null }>();
  for (const s of sessions) {
    if (!s.steamid64) continue;
    if (!freshest.has(s.steamid64)) {
      freshest.set(s.steamid64, { userId: s.userId, last: s.lastHeartbeatAt });
    }
  }

  // A player is "stale" if they have no fresh session for this match.
  const stale = roster.filter((r) => {
    const f = freshest.get(r.steamid64);
    if (!f || !f.last) return true;
    return f.last < cutoff;
  });
  if (stale.length === 0) return [];

  // Resolve in-game userids via a single `status` call, then kick each stale player.
  let statusOut = "";
  try {
    statusOut = await rconExec({
      host: match.host,
      port: match.port,
      password,
      commands: ["status"],
    });
  } catch {
    return [];
  }
  const userIds = parseStatusUserIds(statusOut);

  const kicked: string[] = [];
  for (const p of stale) {
    const userid = userIds.get(p.steamid64);
    if (!userid) continue; // not currently connected — nothing to kick
    try {
      await rconExec({
        host: match.host,
        port: match.port,
        password,
        commands: [`kickid ${userid} Anticheat client not running`],
      });
      kicked.push(p.steamid64);
      const f = freshest.get(p.steamid64);
      await insertAcEvent({
        userId: f?.userId ?? "00000000-0000-0000-0000-000000000000",
        steamid64: p.steamid64,
        matchId: match.matchId,
        kind: "kicked",
        severity: "medium",
        payload: { reason: "ac_heartbeat_silent", thresholdSeconds: AC_INMATCH_KICK_S },
        dedupParts: { matchId: match.matchId, reason: "ac_silent" },
      }).catch(() => {});
    } catch {
      // best-effort; try the next player
    }
  }
  return kicked;
}

/** Resolver step: sweep all live matches and kick AC-silent players. */
export async function sweepAcKicks(): Promise<{ kicked: number; matches: number }> {
  if (!isAcGateEnabled()) return { kicked: 0, matches: 0 };
  const live = await liveMatchesWithServers();
  let kicked = 0;
  for (const m of live) {
    try {
      const out = await kickStaleAcPlayers(m);
      kicked += out.length;
    } catch {
      // per-match isolation — one bad row can't stall the sweep
    }
  }
  return { kicked, matches: live.length };
}
