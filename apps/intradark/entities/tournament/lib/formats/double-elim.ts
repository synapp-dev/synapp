/**
 * Pure double-elimination construction (power-of-two fields, n ≥ 4). Produces a
 * winners bracket (WB), losers bracket (LB), and a single grand final (GF), with
 * full winner-advancement AND loser-drop wiring. No DB imports → unit-testable.
 *
 * Loser routing: WB-R1 losers fill LB-R1; WB-R(j≥2) losers drop into LB major
 * round 2(j−1) as the "away" side against the LB survivor. LB alternates minor
 * rounds (survivors only) and major rounds (survivors vs WB droppers). GF reset
 * is NOT modelled in v1 (config accepted, single GF played).
 */
import { seedSlots } from "./bracket-tree";

export type DeBracket = "wb" | "lb" | "gf";

export interface DeMatch {
  key: string;
  bracket: DeBracket;
  round: number;
  index: number;
  homeSeed: number | null; // 0-based, only WB round 1
  awaySeed: number | null;
  winnerTo: string | null;
  winnerSlot: "home" | "away" | null;
  loserTo: string | null;
  loserSlot: "home" | "away" | null;
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}

const wbKey = (r: number, i: number) => `wb-${r}-${i}`;
const lbKey = (r: number, i: number) => `lb-${r}-${i}`;

/** Build a double-elim tree for n entrants (n must be a power of two ≥ 4). */
export function buildDoubleElim(n: number): DeMatch[] {
  if (!isPowerOfTwo(n) || n < 4) {
    throw new Error("double-elim requires a power-of-two field of at least 4");
  }
  const k = Math.round(Math.log2(n));
  const matches: DeMatch[] = [];
  const slots = seedSlots(n); // 1-based seed numbers per WB-R1 position

  // ---- Winners bracket ----
  for (let r = 1; r <= k; r++) {
    const cnt = n / 2 ** r;
    for (let i = 0; i < cnt; i++) {
      const homeSeed = r === 1 ? slots[i * 2]! - 1 : null;
      const awaySeed = r === 1 ? slots[i * 2 + 1]! - 1 : null;
      const winnerTo = r < k ? wbKey(r + 1, Math.floor(i / 2)) : "gf";
      const winnerSlot: "home" | "away" = r < k ? (i % 2 === 0 ? "home" : "away") : "home";
      let loserTo: string;
      let loserSlot: "home" | "away";
      if (r === 1) {
        loserTo = lbKey(1, Math.floor(i / 2));
        loserSlot = i % 2 === 0 ? "home" : "away";
      } else {
        loserTo = lbKey(2 * (r - 1), i);
        loserSlot = "away";
      }
      matches.push({
        key: wbKey(r, i),
        bracket: "wb",
        round: r,
        index: i,
        homeSeed,
        awaySeed,
        winnerTo,
        winnerSlot,
        loserTo,
        loserSlot,
      });
    }
  }

  // ---- Losers bracket ----
  const rlb = 2 * (k - 1);
  const m: number[] = [];
  m[1] = n / 4;
  for (let r = 2; r <= rlb; r++) {
    m[r] = r % 2 === 0 ? m[r - 1]! : m[r - 1]! / 2;
  }
  for (let r = 1; r <= rlb; r++) {
    for (let i = 0; i < m[r]!; i++) {
      let winnerTo: string;
      let winnerSlot: "home" | "away";
      if (r < rlb) {
        if (r % 2 === 1) {
          // minor → next major, 1:1, survivor on home
          winnerTo = lbKey(r + 1, i);
          winnerSlot = "home";
        } else {
          // major → next minor, 2:1
          winnerTo = lbKey(r + 1, Math.floor(i / 2));
          winnerSlot = i % 2 === 0 ? "home" : "away";
        }
      } else {
        winnerTo = "gf";
        winnerSlot = "away";
      }
      matches.push({
        key: lbKey(r, i),
        bracket: "lb",
        round: r,
        index: i,
        homeSeed: null,
        awaySeed: null,
        winnerTo,
        winnerSlot,
        loserTo: null,
        loserSlot: null,
      });
    }
  }

  // ---- Grand final ----
  matches.push({
    key: "gf",
    bracket: "gf",
    round: k + 1,
    index: 0,
    homeSeed: null,
    awaySeed: null,
    winnerTo: null,
    winnerSlot: null,
    loserTo: null,
    loserSlot: null,
  });

  return matches;
}
