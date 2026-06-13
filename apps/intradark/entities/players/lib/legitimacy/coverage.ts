import type { ConfidenceBand, LegitimacyInput } from "@/entities/players/lib/legitimacy/types";

const COVERAGE_SOURCES = [
  "steam",
  "steam_enrichment",
  "leetify",
  "faceit",
  "gc",
  "platform",
] as const;

export type CoverageSource = (typeof COVERAGE_SOURCES)[number];

export function listInputsPresent(input: LegitimacyInput): string[] {
  const present: string[] = [];

  if (input.accountCreatedAt != null) present.push("steam");
  if (
    input.vacBanned != null ||
    input.cs2PlaytimeMinutes != null ||
    input.badgeCount != null ||
    input.steamLevel != null
  ) {
    present.push("steam_enrichment");
  }
  if (input.hasLeetify) present.push("leetify");
  if (input.hasFaceit) present.push("faceit");
  if (input.hasGc) present.push("gc");
  if (input.discordLinked || input.emailVerified) present.push("platform");

  return present;
}

export function computeCoverage(input: LegitimacyInput): number {
  const present = new Set(listInputsPresent(input));
  const count = COVERAGE_SOURCES.filter((s) => present.has(s)).length;
  return count / COVERAGE_SOURCES.length;
}

export function confidenceBand(coverage: number): ConfidenceBand {
  if (coverage < 0.34) return "low";
  if (coverage < 0.67) return "med";
  return "high";
}
