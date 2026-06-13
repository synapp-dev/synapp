import type { LegitimacyInput } from "@/entities/players/lib/legitimacy/types";
import {
  accountAgeYearsFromIso,
  clamp01,
  normalizeAccountAgeYears,
  normalizeCountLog,
  normalizeFaceitElo,
  normalizeLeetifyFraction,
  normalizePremierRating,
} from "@/entities/players/lib/legitimacy/normalize";

function avg(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Skill estimate S from stats (0–1). */
export function estimateSkill(input: LegitimacyInput): number {
  const parts = [
    normalizeLeetifyFraction(input.leetifyRating),
    normalizeLeetifyFraction(input.aim),
    normalizeFaceitElo(input.faceitElo),
    normalizePremierRating(input.premierRating),
  ];
  return clamp01(avg(parts));
}

/** Earned/support estimate E from tenure + volume + corroboration (0–1). */
export function estimateEarned(input: LegitimacyInput): number {
  const years = accountAgeYearsFromIso(input.accountCreatedAt);
  const tenure = normalizeAccountAgeYears(years);
  const hours =
    input.cs2PlaytimeMinutes != null
      ? normalizeCountLog(input.cs2PlaytimeMinutes / 60, 3000)
      : 0;
  const games = normalizeCountLog(input.gamesPlayed ?? 0, 500);
  const faceit =
    input.faceitLevel != null ? clamp01(input.faceitLevel / 10) : 0;
  const faceitPresence = input.hasFaceit ? 0.15 : 0;
  const leetifyPresence = input.hasLeetify ? 0.1 : 0;
  const gcPresence = input.hasGc ? 0.05 : 0;

  const volume = clamp01(hours * 0.4 + games * 0.35 + faceit * 0.25);
  const corroboration = clamp01(faceitPresence + leetifyPresence + gcPresence);

  return clamp01(tenure * 0.35 + volume * 0.45 + corroboration * 0.2);
}

function skillTenureSuspicion(input: LegitimacyInput, s: number, e: number): number {
  const gap = Math.max(0, s - e);
  const years = accountAgeYearsFromIso(input.accountCreatedAt);
  if (years < 0.5 && s > 0.55) return gap * 1.2;
  return gap;
}

function skillBalanceSuspicion(input: LegitimacyInput): number {
  const aim = normalizeLeetifyFraction(input.aim);
  if (aim < 0.5) return 0;
  const support = avg([
    normalizeLeetifyFraction(input.utility),
    normalizeLeetifyFraction(input.positioning),
    normalizeLeetifyFraction(input.opening),
    normalizeLeetifyFraction(input.clutch),
  ]);
  const gap = Math.max(0, aim - support - 0.15);
  return clamp01(gap * 1.5);
}

function skillCorroborationSuspicion(input: LegitimacyInput, s: number): number {
  if (s < 0.45) return 0;
  let suspicion = 0;
  if (!input.hasFaceit && s > 0.5) suspicion += 0.2;
  if (!input.hasLeetify && s > 0.5) suspicion += 0.15;
  if (input.communityVisibility === 1) suspicion += 0.2;
  return clamp01(suspicion);
}

function temporalAnomalySuspicion(input: LegitimacyInput): number {
  const games = input.games ?? [];
  if (games.length < 4) return 0;

  const ratings = games
    .map((g) => g.leetifyRating)
    .filter((r): r is number => r != null && Number.isFinite(r));
  if (ratings.length < 4) return 0;

  const recent = ratings.slice(0, Math.min(5, ratings.length));
  const older = ratings.slice(Math.min(5, ratings.length));
  if (older.length === 0) return 0;

  const recentAvg = avg(recent);
  const olderAvg = avg(older);
  const jump = Math.max(0, recentAvg - olderAvg - 0.02);

  let bannedExposure = 0;
  for (const g of games.slice(0, 10)) {
    if (g.hasBannedPlayer) bannedExposure += 0.03;
  }

  return clamp01(jump * 8 + Math.min(bannedExposure, 0.15));
}

export interface CoherenceResult {
  skillEstimate: number;
  earnedEstimate: number;
  suspicion: number;
}

export function computeCoherence(input: LegitimacyInput): CoherenceResult {
  const skillEstimate = estimateSkill(input);
  const earnedEstimate = estimateEarned(input);

  const parts = [
    skillTenureSuspicion(input, skillEstimate, earnedEstimate),
    skillBalanceSuspicion(input),
    skillCorroborationSuspicion(input, skillEstimate),
    temporalAnomalySuspicion(input),
  ];

  const suspicion = clamp01(
    parts.reduce((sum, p) => sum + p, 0) / Math.max(parts.filter((p) => p > 0).length, 1),
  );

  return { skillEstimate, earnedEstimate, suspicion };
}
