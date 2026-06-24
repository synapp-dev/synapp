/**
 * §2 queue eligibility — pure decision over already-fetched facts so it stays
 * unit-testable. The DB-touching parts (cooldown lookup) live in queries.ts; this
 * just renders the verdict + the user-facing reason for the first failing gate.
 */

export type EligibilityInput = {
  steamLinked: boolean;
  discordLinked: boolean;
  /** Active cooldown expiry, or null if none. */
  cooldownUntil: Date | null;
  now: Date;
};

export type EligibilityVerdict = { eligible: boolean; reason: string | null };

export function evaluateEligibility(input: EligibilityInput): EligibilityVerdict {
  if (!input.steamLinked) {
    return { eligible: false, reason: "Link your Steam account to queue." };
  }
  if (!input.discordLinked) {
    return { eligible: false, reason: "Link your Discord account to queue." };
  }
  if (
    input.cooldownUntil &&
    input.cooldownUntil.getTime() > input.now.getTime()
  ) {
    return {
      eligible: false,
      reason: `You're on a queue cooldown until ${input.cooldownUntil.toISOString()}.`,
    };
  }
  return { eligible: true, reason: null };
}
