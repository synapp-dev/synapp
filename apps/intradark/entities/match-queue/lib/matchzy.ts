/**
 * MatchZy webhook parsing (PUG plan §5.1). Pure + tolerant: turns a MatchZy
 * `map_result` / `series_end` payload into the canonical MatchResultInput that
 * finalizeMatch consumes. Field names are defensive because MatchZy versions
 * vary; spike the live 0.8.15 contract before trusting in prod.
 */
import type { MatchResultInput, PlayerStatLine } from "./finalize";

type Json = Record<string, unknown>;

function asNum(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function asStr(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

/** The MatchZy `matchid` we set in the served config = our matches.id (uuid). */
export function extractMatchId(raw: Json): string | undefined {
  return asStr(raw.matchid) ?? asStr(raw.match_id) ?? asStr((raw.matchzy as Json | undefined)?.matchid);
}

/** True for events that finalize a (best-of-1) match. */
export function isFinalizingEvent(raw: Json): boolean {
  const ev = asStr(raw.event) ?? asStr(raw.event_type);
  return ev === "series_end" || ev === "map_result";
}

function parsePlayers(team: Json | undefined, teamNo: 1 | 2): PlayerStatLine[] {
  const players = Array.isArray(team?.players) ? (team!.players as Json[]) : [];
  const out: PlayerStatLine[] = [];
  for (const p of players) {
    const steamid64 = asStr(p.steamid64) ?? asStr(p.steamid) ?? asStr(p.steamID);
    if (!steamid64) continue;
    const stats = (p.stats as Json | undefined) ?? p;
    out.push({
      steamid64,
      kills: asNum(stats.kills),
      deaths: asNum(stats.deaths),
      assists: asNum(stats.assists),
      headshotKills: asNum(stats.headshot_kills) ?? asNum(stats.headshots) ?? asNum(stats.hsk),
      damage: asNum(stats.damage) ?? asNum(stats.dmg),
      mvps: asNum(stats.mvps),
    });
  }
  void teamNo;
  return out;
}

/**
 * Parse a finalizing MatchZy event into a MatchResultInput, or null if it isn't
 * one / can't be understood. Winner derived from `winner` else from scores.
 */
export function parseMatchzyResult(raw: Json): MatchResultInput | null {
  if (!isFinalizingEvent(raw)) return null;

  const t1 = raw.team1 as Json | undefined;
  const t2 = raw.team2 as Json | undefined;

  const scoreTeam1 =
    asNum(t1?.score) ?? asNum(raw.team1_score) ?? asNum((raw.score as Json | undefined)?.team1) ?? 0;
  const scoreTeam2 =
    asNum(t2?.score) ?? asNum(raw.team2_score) ?? asNum((raw.score as Json | undefined)?.team2) ?? 0;

  const winnerRaw =
    asStr((raw.winner as Json | undefined)?.team) ??
    asStr(raw.winner) ??
    asStr((raw.winner as Json | undefined)?.side);
  let winnerTeam: 1 | 2 | null;
  if (winnerRaw === "team1") winnerTeam = 1;
  else if (winnerRaw === "team2") winnerTeam = 2;
  else if (scoreTeam1 > scoreTeam2) winnerTeam = 1;
  else if (scoreTeam2 > scoreTeam1) winnerTeam = 2;
  else winnerTeam = null;

  const playerStats = [...parsePlayers(t1, 1), ...parsePlayers(t2, 2)];

  return {
    winnerTeam,
    scoreTeam1,
    scoreTeam2,
    map: asStr(raw.map_name) ?? asStr(raw.map),
    playerStats: playerStats.length ? playerStats : undefined,
  };
}
