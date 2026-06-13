import type { AwardRulePack } from "@/server/workforce/award/award-types";

/** Canonical seed data — mirrors `20260601170000_award_rate_library.sql`. */
export const BUILTIN_AWARD_RULE_PACKS: Record<string, AwardRulePack> = {
  MA000119: {
    awardCode: "MA000119",
    awardName: "Restaurant Industry Award 2020",
    awardShortName: "Restaurant",
    prReference: "PR786658",
    sourceUrl:
      "https://www.fairwork.gov.au/employment-conditions/awards/award-summary/ma000119-summary",
    casualLoadingPct: 25,
    rates: [
      rate("MA000119", "Level 1", "1", "full_time", 2310),
      rate("MA000119", "Level 1", "1", "part_time", 2310),
      rate("MA000119", "Level 1", "1", "casual", 2310),
      rate("MA000119", "Level 2", "2", "full_time", 2520),
      rate("MA000119", "Level 2", "2", "part_time", 2520),
      rate("MA000119", "Level 2", "2", "casual", 2520),
      rate("MA000119", "Level 3", "3", "full_time", 2730),
      rate("MA000119", "Level 3", "3", "part_time", 2730),
      rate("MA000119", "Level 3", "3", "casual", 2730),
    ],
    penalties: [
      penalty("MA000119", "ft_pt", "saturday", "percentage", 25),
      penalty("MA000119", "casual", "saturday", "percentage", 50),
      penalty("MA000119", "ft_pt", "sunday", "percentage", 50),
      penalty("MA000119", "casual", "sunday", "percentage", 75),
      penalty("MA000119", "all", "mon_fri", "dollar_per_hour", 281, "18:00", "24:00"),
      penalty("MA000119", "all", "mon_fri", "dollar_per_hour", 422, "00:00", "06:00"),
    ],
    minimumEngagements: [
      { employmentType: "casual", dayType: "regular", minimumHours: 3 },
      { employmentType: "full_time", dayType: "public_holiday", minimumHours: 4 },
    ],
  },
  MA000009: {
    awardCode: "MA000009",
    awardName: "Hospitality Industry (General) Award 2020",
    awardShortName: "Hospitality",
    prReference: "PR786658",
    sourceUrl:
      "https://www.fairwork.gov.au/employment-conditions/awards/award-summary/ma000009-summary",
    casualLoadingPct: 25,
    rates: [
      rate("MA000009", "Level 1", "1", "full_time", 2280),
      rate("MA000009", "Level 1", "1", "part_time", 2280),
      rate("MA000009", "Level 1", "1", "casual", 2280),
      rate("MA000009", "Level 2", "2", "full_time", 2490),
      rate("MA000009", "Level 2", "2", "part_time", 2490),
      rate("MA000009", "Level 2", "2", "casual", 2490),
    ],
    penalties: [
      penalty("MA000009", "ft_pt", "saturday", "percentage", 25),
      penalty("MA000009", "casual", "saturday", "percentage", 50),
      penalty("MA000009", "ft_pt", "sunday", "percentage", 50),
      penalty("MA000009", "casual", "sunday", "percentage", 75),
    ],
    minimumEngagements: [{ employmentType: "casual", dayType: "regular", minimumHours: 3 }],
  },
};

function rate(
  _awardCode: string,
  level: string,
  grade: string,
  employmentType: "full_time" | "part_time" | "casual",
  baseHourlyCents: number,
) {
  const casualLoaded = Math.round(baseHourlyCents * 1.25);
  return {
    classificationLevel: level,
    classificationGrade: grade,
    employmentType,
    baseHourlyCents,
    casualLoadedHourlyCents: casualLoaded,
    effectiveFrom: "2025-07-01",
    effectiveUntil: null,
  };
}

function penalty(
  _awardCode: string,
  scope: "ft_pt" | "casual" | "all",
  dayType: "mon_fri" | "saturday" | "sunday",
  upliftType: "percentage" | "dollar_per_hour",
  upliftValue: number,
  timeStart = "00:00",
  timeEnd = "24:00",
) {
  return {
    classificationLevel: null,
    employmentTypeScope: scope,
    dayType,
    timeStart,
    timeEnd,
    upliftType,
    upliftValue,
    effectiveFrom: "2025-07-01",
    effectiveUntil: null,
  };
}

export function getBuiltinRulePack(awardCode: string): AwardRulePack | null {
  return BUILTIN_AWARD_RULE_PACKS[awardCode] ?? null;
}

export function listBuiltinAwardCodes(): string[] {
  return Object.keys(BUILTIN_AWARD_RULE_PACKS);
}
