/**
 * Derive Premier rating and per-season rank summaries from Leetify v3 `games[]`.
 * Season boundaries follow Valve CS2 Premier seasons (see PREMIER_SEASONS).
 */

export interface SeasonRankRange {
  min: number;
  max: number;
  current?: number;
}

export interface SeasonSummary {
  id: string;
  label: string;
  start: string;
  end: string;
  matches: number;
  winRate: number;
  premier?: SeasonRankRange;
  competitive?: { min: number; max: number };
}

export interface SeasonRanksSummary {
  currentPremier: number | null;
  seasons: SeasonSummary[];
}

/** Valve Premier season windows (end exclusive). Update when Season 5 dates ship. */
export const PREMIER_SEASONS = [
  { id: "beta", label: "Beta Season", start: "2023-09-01", end: "2023-09-27" },
  { id: "s1", label: "Season One", start: "2023-09-27", end: "2025-01-28" },
  { id: "s2", label: "Season Two", start: "2025-01-28", end: "2025-07-15" },
  { id: "s3", label: "Season Three", start: "2025-07-15", end: "2026-01-21" },
  { id: "s4", label: "Season Four", start: "2026-01-21", end: "2026-07-20" },
] as const;

interface LeetifyGame {
  dataSource?: string;
  rankType?: number | null;
  isCs2?: boolean;
  skillLevel?: number;
  gameFinishedAt?: string;
  matchResult?: string;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

function parseGame(v: unknown): LeetifyGame | null {
  const g = asRecord(v);
  if (!g.gameFinishedAt || typeof g.gameFinishedAt !== "string") return null;
  return {
    dataSource: typeof g.dataSource === "string" ? g.dataSource : undefined,
    rankType: asNumber(g.rankType),
    isCs2: typeof g.isCs2 === "boolean" ? g.isCs2 : undefined,
    skillLevel: asNumber(g.skillLevel) ?? undefined,
    gameFinishedAt: g.gameFinishedAt,
    matchResult: typeof g.matchResult === "string" ? g.matchResult : undefined,
  };
}

function inSeason(finishedAt: string, start: string, end: string): boolean {
  const t = new Date(finishedAt).getTime();
  return (
    t >= new Date(start).getTime() && t < new Date(end).getTime()
  );
}

/** Premier: matchmaking + rankType 11 + CS2. */
export function isPremierGame(g: LeetifyGame): boolean {
  return (
    g.dataSource === "matchmaking" &&
    g.rankType === 11 &&
    g.isCs2 !== false &&
    typeof g.skillLevel === "number" &&
    g.skillLevel > 1000
  );
}

/** Competitive MM rank 1–18. */
export function isCompetitiveGame(g: LeetifyGame): boolean {
  if (g.isCs2 === false) return false;
  if (g.dataSource === "matchmaking_competitive") {
    return typeof g.skillLevel === "number" && g.skillLevel >= 1 && g.skillLevel <= 18;
  }
  return (
    g.dataSource === "matchmaking" &&
    g.rankType === 12 &&
    typeof g.skillLevel === "number" &&
    g.skillLevel >= 1 &&
    g.skillLevel <= 18
  );
}

function isCs2SeasonGame(g: LeetifyGame): boolean {
  return g.isCs2 !== false;
}

function minMax(values: number[]): { min: number; max: number } | undefined {
  if (values.length === 0) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

function currentPremierInSeason(games: LeetifyGame[]): number | undefined {
  const premier = games
    .filter(isPremierGame)
    .sort(
      (a, b) =>
        new Date(b.gameFinishedAt!).getTime() -
        new Date(a.gameFinishedAt!).getTime(),
    );
  return premier[0]?.skillLevel;
}

/** Parse games into season summaries and global current Premier rating. */
export function parseLeetifySeasons(raw: unknown): SeasonRanksSummary | null {
  const root = asRecord(raw);
  const gamesRaw = root.games;
  if (!Array.isArray(gamesRaw) || gamesRaw.length === 0) return null;

  const games = gamesRaw
    .map(parseGame)
    .filter((g): g is LeetifyGame => g != null);

  if (games.length === 0) return null;

  const allPremier = games
    .filter(isPremierGame)
    .sort(
      (a, b) =>
        new Date(b.gameFinishedAt!).getTime() -
        new Date(a.gameFinishedAt!).getTime(),
    );
  const currentPremier = allPremier[0]?.skillLevel ?? null;

  const seasons: SeasonSummary[] = [];

  for (const season of PREMIER_SEASONS) {
    const seasonGames = games.filter(
      (g) =>
        isCs2SeasonGame(g) &&
        inSeason(g.gameFinishedAt!, season.start, season.end),
    );
    if (seasonGames.length === 0) continue;

    const wins = seasonGames.filter((g) => g.matchResult === "win").length;
    const winRate = Number((wins / seasonGames.length).toFixed(2));

    const premierLevels = seasonGames
      .filter(isPremierGame)
      .map((g) => g.skillLevel!);
    const compLevels = seasonGames
      .filter(isCompetitiveGame)
      .map((g) => g.skillLevel!);

    const premierRange = minMax(premierLevels);
    const compRange = minMax(compLevels);
    const current = currentPremierInSeason(seasonGames);

    seasons.push({
      id: season.id,
      label: season.label,
      start: season.start,
      end: season.end,
      matches: seasonGames.length,
      winRate,
      ...(premierRange
        ? {
            premier: {
              ...premierRange,
              ...(current != null ? { current } : {}),
            },
          }
        : {}),
      ...(compRange ? { competitive: compRange } : {}),
    });
  }

  return { currentPremier, seasons };
}

export interface LeetifyProStatus {
  csgoPro: boolean;
  cs2Pro: boolean;
}

/** True when Leetify game history includes at least one HLTV-sourced match. */
export function parseLeetifyProStatus(raw: unknown): LeetifyProStatus {
  const root = asRecord(raw);
  const gamesRaw = root.games;
  if (!Array.isArray(gamesRaw) || gamesRaw.length === 0) {
    return { csgoPro: false, cs2Pro: false };
  }

  let csgoPro = false;
  let cs2Pro = false;

  for (const gameRaw of gamesRaw) {
    const g = parseGame(gameRaw);
    if (!g || g.dataSource !== "hltv") continue;
    if (g.isCs2 === true) cs2Pro = true;
    else if (g.isCs2 === false) csgoPro = true;
    if (csgoPro && cs2Pro) break;
  }

  return { csgoPro, cs2Pro };
}
