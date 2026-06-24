/**
 * §5 team-name generation. Two distinct call-signs per match, derived from the match
 * sequence so a given match always renders the same names (no Math.random — stable
 * across re-reads / SSR). Client-safe.
 */

const TEAM_NAMES = [
  "Ronin",
  "Vanguard",
  "Phantom",
  "Sentinel",
  "Apex",
  "Nemesis",
  "Outlaws",
  "Tempest",
  "Valkyrie",
  "Cobra",
  "Spectre",
  "Titan",
  "Mirage",
  "Onyx",
  "Falcon",
  "Hydra",
  "Echo",
  "Wraith",
  "Saber",
  "Reaper",
] as const;

/** Deterministic pair of distinct team names for a match sequence. */
export function teamNamesForSeq(seq: number): { team1: string; team2: string } {
  const n = TEAM_NAMES.length;
  const a = Math.abs(Math.trunc(seq)) % n;
  // Offset by a coprime-ish stride so the two names are always different and spread.
  const b = (a + 7) % n;
  return { team1: TEAM_NAMES[a]!, team2: TEAM_NAMES[b === a ? (b + 1) % n : b]! };
}
