/**
 * Parse a Leetify profile payload from the Leetify web app API
 * (`api.cs-prod.leetify.com/api/profile/id/{steamid64}`).
 * The v3 shape nests skill scores under `rating`, ranks under `ranks`, and
 * exposes `winrate`/`total_matches` at the root. Older shapes flattened these
 * under `recentGameRatings`, so the helpers keep defensive fallbacks. Raw JSON
 * is always archived alongside, so a shape change degrades parsed/derived
 * fields but never the archive.
 */

import {
  parseLeetifyProStatus,
  parseLeetifySeasons,
  type SeasonRanksSummary,
} from "@/entities/players/lib/parse-leetify-seasons";

export type {
  LeetifyProStatus,
  SeasonRanksSummary,
  SeasonSummary,
} from "@/entities/players/lib/parse-leetify-seasons";

export interface ParsedLeetify {
  leetify_rating: number | null;
  aim: number | null;
  positioning: number | null;
  utility: number | null;
  games_played: number | null;
  premier_rating: number | null;
  season_ranks: SeasonRanksSummary | null;
}

/** Client-facing, normalized view rendered by the Leetify panel. */
export interface LeetifyView {
  name: string | null;
  /** Overall Leetify rating as UI percentage (e.g. 1.02). */
  rating: number | null;
  ctLeetify: number | null;
  tLeetify: number | null;
  aim: number | null;
  positioning: number | null;
  utility: number | null;
  opening: number | null;
  clutch: number | null;
  reactionTimeMs: number | null;
  winrate: number | null;
  matches: number | null;
  premier: number | null;
  premierRating: number | null;
  seasonRanks: SeasonRanksSummary | null;
  faceitElo: number | null;
  /** At least one HLTV-sourced CS:GO match in Leetify game history. */
  csgoPro: boolean;
  /** At least one HLTV-sourced CS2 match in Leetify game history. */
  cs2Pro: boolean;
}

export interface LeetifySnapshotColumns {
  premier_rating?: number | null;
  season_ranks?: SeasonRanksSummary | null;
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function asNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

function firstNumber(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = asNumber(v);
    if (n != null) return n;
  }
  return null;
}

/** Convert a Leetify fraction (e.g. 0.0338) into a percentage (3.38). */
function asPercent(v: unknown): number | null {
  const n = asNumber(v);
  return n != null ? Number((n * 100).toFixed(2)) : null;
}

/**
 * Leetify overall rating magnitudes: v3 usually sends ~0.0102 (fraction);
 * some payloads send ~1.02 (already percentage points).
 */
const LEETIFY_RATING_FRACTION_THRESHOLD = 0.25;

function isLeetifyRatingFraction(n: number): boolean {
  return Math.abs(n) < LEETIFY_RATING_FRACTION_THRESHOLD;
}

/** UI percentage (e.g. 1.02), regardless of API fraction vs points form. */
function toLeetifyDisplayPercent(n: number): number {
  return Number((isLeetifyRatingFraction(n) ? n * 100 : n).toFixed(2));
}

/** Canonical fraction stored on player_leetify_snapshots.leetify_rating. */
function toLeetifyStoredFraction(n: number): number {
  return Number((isLeetifyRatingFraction(n) ? n : n / 100).toFixed(6));
}

/** Flat overall Leetify rating — not CT+T sum. */
function flatLeetifyRatingRaw(
  rating: Record<string, unknown>,
  recent: Record<string, unknown>,
  ranks: Record<string, unknown>,
): number | null {
  return firstNumber(recent.leetify, rating.leetify, ranks.leetify);
}

function resolveSeasonRanks(
  raw: unknown,
  stored?: SeasonRanksSummary | null,
): SeasonRanksSummary | null {
  if (stored != null) return stored;
  return parseLeetifySeasons(raw);
}

function resolvePremierRating(
  raw: unknown,
  stored: number | null | undefined,
  seasonRanks: SeasonRanksSummary | null,
): number | null {
  if (stored != null) return stored;
  if (seasonRanks?.currentPremier != null) return seasonRanks.currentPremier;
  const ranks = asRecord(asRecord(raw).ranks);
  return firstNumber(ranks.premier);
}

export function parseLeetify(raw: unknown): ParsedLeetify {
  const root = asRecord(raw);
  const rating = asRecord(root.rating);
  const ranks = asRecord(root.ranks);
  const stats = asRecord(root.stats);
  const recent = asRecord(root.recentGameRatings);
  const season_ranks = parseLeetifySeasons(raw);
  const flatRaw = flatLeetifyRatingRaw(rating, recent, ranks);

  return {
    leetify_rating:
      flatRaw != null ? toLeetifyStoredFraction(flatRaw) : null,
    aim: firstNumber(rating.aim, recent.aim, stats.aim),
    positioning: firstNumber(
      rating.positioning,
      recent.positioning,
      stats.positioning,
    ),
    utility: firstNumber(rating.utility, recent.utility, stats.utility),
    games_played: firstNumber(
      root.total_matches,
      recent.gamesPlayed,
      stats.games_played,
      root.games_played,
    ),
    premier_rating: season_ranks?.currentPremier ?? firstNumber(ranks.premier),
    season_ranks,
  };
}

/** Normalize a raw Leetify payload into the client-facing view. */
export function normalizeLeetify(
  raw: unknown,
  stored?: LeetifySnapshotColumns,
): LeetifyView {
  const root = asRecord(raw);
  const rating = asRecord(root.rating);
  const ranks = asRecord(root.ranks);
  const stats = asRecord(root.stats);
  const recent = asRecord(root.recentGameRatings);
  const meta = asRecord(root.meta);

  const winrateFraction = asNumber(root.winrate);
  const seasonRanks = resolveSeasonRanks(raw, stored?.season_ranks);
  const premierRating = resolvePremierRating(
    raw,
    stored?.premier_rating,
    seasonRanks,
  );
  const flatRaw = flatLeetifyRatingRaw(rating, recent, ranks);
  const proStatus = parseLeetifyProStatus(raw);

  return {
    name:
      typeof root.name === "string"
        ? root.name
        : typeof meta.name === "string"
          ? meta.name
          : null,
    rating: flatRaw != null ? toLeetifyDisplayPercent(flatRaw) : null,
    ctLeetify: asPercent(rating.ct_leetify ?? recent.ctLeetify),
    tLeetify: asPercent(rating.t_leetify ?? recent.tLeetify),
    aim: firstNumber(rating.aim, recent.aim),
    positioning: firstNumber(rating.positioning, recent.positioning),
    utility: firstNumber(rating.utility, recent.utility),
    opening: asPercent(rating.opening ?? recent.opening),
    clutch: asPercent(rating.clutch ?? recent.clutch),
    reactionTimeMs: firstNumber(stats.reaction_time_ms),
    winrate:
      winrateFraction != null
        ? Number((winrateFraction * 100).toFixed(2))
        : null,
    matches: firstNumber(root.total_matches, recent.gamesPlayed),
    premier: premierRating ?? firstNumber(ranks.premier),
    premierRating,
    seasonRanks,
    faceitElo: firstNumber(ranks.faceit_elo),
    csgoPro: proStatus.csgoPro,
    cs2Pro: proStatus.cs2Pro,
  };
}
