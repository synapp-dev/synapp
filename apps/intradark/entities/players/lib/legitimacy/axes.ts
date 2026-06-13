import type { LegitimacyInput } from "@/entities/players/lib/legitimacy/types";
import { computeCoherence } from "@/entities/players/lib/legitimacy/coherence";
import {
  accountAgeYearsFromIso,
  clamp01,
  normalizeAccountAgeYears,
  normalizeCountLog,
  normalizeFaceitElo,
  normalizeLeetifyFraction,
  toAxisScore,
} from "@/entities/players/lib/legitimacy/normalize";

/** Former standalone axis weight — folded into plausibility display score. */
const SKILL_BLEND_WEIGHT = 0.05;
const PLAUSIBILITY_AXIS_WEIGHT = 0.5;

function scoreSkillStandalone(input: LegitimacyInput): number {
  const parts = [
    normalizeLeetifyFraction(input.leetifyRating),
    normalizeFaceitElo(input.faceitElo),
  ];
  const valid = parts.filter((p) => p > 0);
  if (valid.length === 0) return 50;
  return toAxisScore(avg(valid));

  function avg(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

export function scorePlausibility(input: LegitimacyInput): {
  score: number;
  drivers: string[];
} {
  const { suspicion, skillEstimate, earnedEstimate } = computeCoherence(input);
  const coherenceScore = toAxisScore(clamp01(1 - suspicion));
  const skillScore = scoreSkillStandalone(input);
  const coherenceWeight = PLAUSIBILITY_AXIS_WEIGHT - SKILL_BLEND_WEIGHT;
  const score = Math.round(
    (coherenceScore * coherenceWeight + skillScore * SKILL_BLEND_WEIGHT) /
      PLAUSIBILITY_AXIS_WEIGHT,
  );
  const drivers: string[] = [];

  if (suspicion < 0.2 && skillEstimate > 0.4) {
    drivers.push("Stats match account history");
  }
  if (skillEstimate > 0.55 && earnedEstimate > 0.5) {
    drivers.push("Earned skill coherence");
  }
  if (skillScore >= 65 && suspicion < 0.25) {
    drivers.push("Strong legit skill signal");
  }
  if (suspicion >= 0.35) {
    drivers.push("Skill/support mismatch flagged");
  }

  return { score, drivers };
}

export function scoreEstablishment(input: LegitimacyInput): {
  score: number;
  drivers: string[];
} {
  const years = accountAgeYearsFromIso(input.accountCreatedAt);
  const age = normalizeAccountAgeYears(years);
  const level = normalizeCountLog(input.steamLevel ?? 0, 500);
  const friends = normalizeCountLog(input.friendsCount ?? 0, 500);
  const badges = normalizeCountLog(input.badgeCount ?? 0, 50);
  const publicProfile = input.communityVisibility === 3 ? 1 : 0;
  const complete =
    (input.realname ? 0.15 : 0) + (input.hasCustomAvatar ? 0.1 : 0);

  const fraction = clamp01(
    age * 0.35 +
      level * 0.15 +
      friends * 0.15 +
      badges * 0.1 +
      publicProfile * 0.15 +
      complete,
  );

  const drivers: string[] = [];
  if (years >= 3) drivers.push(`${Math.floor(years)}-yr Steam account`);
  if ((input.friendsCount ?? 0) >= 20) drivers.push("Active friends list");
  if (publicProfile) drivers.push("Public profile");

  return { score: toAxisScore(fraction), drivers };
}

export function scoreCorroboration(input: LegitimacyInput): {
  score: number;
  drivers: string[];
} {
  let fraction = 0;
  const drivers: string[] = [];

  if (input.hasFaceit) {
    fraction += 0.3;
    drivers.push("FACEIT linked");
  }
  if (input.hasLeetify) {
    fraction += 0.25;
    drivers.push("Leetify history");
  }
  if (input.hasGc) {
    fraction += 0.15;
  }
  if (input.discordLinked) {
    fraction += 0.15;
    drivers.push("Discord linked");
  }
  if (input.emailVerified) {
    fraction += 0.1;
    drivers.push("Email verified");
  }
  if ((input.gamesPlayed ?? 0) >= 50) {
    fraction += 0.05;
  }

  return { score: toAxisScore(clamp01(fraction)), drivers };
}

export function scoreKarma(): { score: number; note: string } {
  return { score: 50, note: "phase_2" };
}
