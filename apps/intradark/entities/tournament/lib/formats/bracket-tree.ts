/**
 * Pure single-elimination bracket construction. No DB imports → unit-testable.
 * Produces the match grid with standard seeding (1 vs N), byes assigned to the
 * top seeds, and advancement wiring (which match each winner feeds, into which
 * slot). Used by the bracket driver's generateSchedule.
 */

export interface BracketMatch {
  round: number; // 1 = first round
  index: number; // position within the round, 0-based
  /** Seed index (0-based into the seeded entrant list), or null = bye/empty. */
  homeSeed: number | null;
  awaySeed: number | null;
  /** Where the winner goes (null for the final). */
  nextRound: number | null;
  nextIndex: number | null;
  nextSlot: "home" | "away" | null;
}

export interface BracketTree {
  size: number; // bracket size (power of two)
  rounds: number;
  matches: BracketMatch[];
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(p, 2);
}

/** Standard seeding order for `size` slots, e.g. 8 → [1,8,4,5,2,7,3,6]. */
export function seedSlots(size: number): number[] {
  let slots = [1, 2];
  while (slots.length < size) {
    const sum = slots.length * 2 + 1;
    const next: number[] = [];
    for (const s of slots) {
      next.push(s);
      next.push(sum - s);
    }
    slots = next;
  }
  return slots;
}

/**
 * Build a single-elim tree for `n` entrants (seeded by their order in the seed
 * list). homeSeed/awaySeed are 0-based indexes; values ≥ n are byes (null).
 */
export function buildSingleElim(n: number): BracketTree {
  const size = nextPowerOfTwo(n);
  const rounds = Math.round(Math.log2(size));
  const slots = seedSlots(size); // 1-based seed numbers per bracket position
  const matches: BracketMatch[] = [];

  // Round 1 from the seeded slots.
  const firstRoundCount = size / 2;
  for (let i = 0; i < firstRoundCount; i++) {
    const homeSeedNo = slots[i * 2]!;
    const awaySeedNo = slots[i * 2 + 1]!;
    const homeSeed = homeSeedNo - 1 < n ? homeSeedNo - 1 : null;
    const awaySeed = awaySeedNo - 1 < n ? awaySeedNo - 1 : null;
    matches.push({
      round: 1,
      index: i,
      homeSeed,
      awaySeed,
      nextRound: rounds >= 2 ? 2 : null,
      nextIndex: rounds >= 2 ? Math.floor(i / 2) : null,
      nextSlot: rounds >= 2 ? (i % 2 === 0 ? "home" : "away") : null,
    });
  }

  // Empty later rounds, wired to the following round.
  for (let r = 2; r <= rounds; r++) {
    const count = size / 2 ** r;
    for (let i = 0; i < count; i++) {
      matches.push({
        round: r,
        index: i,
        homeSeed: null,
        awaySeed: null,
        nextRound: r < rounds ? r + 1 : null,
        nextIndex: r < rounds ? Math.floor(i / 2) : null,
        nextSlot: r < rounds ? (i % 2 === 0 ? "home" : "away") : null,
      });
    }
  }

  return { size, rounds, matches };
}

/**
 * Resolve byes: a round-1 match with exactly one entrant auto-advances it. Returns
 * the seed advancing into each next slot, keyed by "round:index:slot".
 */
export function byeAdvancements(tree: BracketTree): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of tree.matches) {
    if (m.round !== 1) continue;
    const present =
      m.homeSeed != null && m.awaySeed == null
        ? m.homeSeed
        : m.awaySeed != null && m.homeSeed == null
          ? m.awaySeed
          : null;
    if (present != null && m.nextRound != null) {
      out.set(`${m.nextRound}:${m.nextIndex}:${m.nextSlot}`, present);
    }
  }
  return out;
}
