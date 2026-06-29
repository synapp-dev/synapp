import { describe, expect, it } from "vitest";

import {
  computeEloDeltas,
  expectedScore,
  kFactor,
  winProbability,
  type EloPlayer,
} from "./elo";

const p = (rating: number, matchesPlayed = 50): EloPlayer => ({
  steamid64: `${rating}-${matchesPlayed}-${Math.random()}`,
  rating,
  matchesPlayed,
});

describe("expectedScore", () => {
  it("is 0.5 for equal ratings", () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 6);
  });
  it("favours the higher rating and is symmetric", () => {
    const e = expectedScore(1200, 1000);
    expect(e).toBeGreaterThan(0.5);
    expect(e + expectedScore(1000, 1200)).toBeCloseTo(1, 6);
  });
});

describe("kFactor", () => {
  it("boosts during placement, settles after", () => {
    expect(kFactor(0)).toBe(40);
    expect(kFactor(9)).toBe(40);
    expect(kFactor(10)).toBe(32);
    expect(kFactor(100)).toBe(32);
  });
});

describe("computeEloDeltas", () => {
  it("evenly matched: winner +16, loser -16 (K=32)", () => {
    const t1 = [p(1000)];
    const t2 = [p(1000)];
    const d = computeEloDeltas(t1, t2, 1);
    expect(d[t1[0]!.steamid64]).toBe(16);
    expect(d[t2[0]!.steamid64]).toBe(-16);
  });

  it("is zero-sum-ish: an upset gains more than a favoured win", () => {
    const fav = p(1400);
    const dog = p(1000);
    const upset = computeEloDeltas([dog], [fav], 1); // dog beats favourite
    const expected = computeEloDeltas([fav], [dog], 1); // favourite wins
    expect(upset[dog.steamid64]!).toBeGreaterThan(expected[fav.steamid64]!);
  });

  it("draw moves equal teams by zero", () => {
    const t1 = [p(1000)];
    const t2 = [p(1000)];
    const d = computeEloDeltas(t1, t2, null);
    expect(d[t1[0]!.steamid64]).toBe(0);
    expect(d[t2[0]!.steamid64]).toBe(0);
  });

  it("uses team averages for 5v5", () => {
    const t1 = [p(1100), p(1100), p(1100), p(1100), p(1100)];
    const t2 = [p(900), p(900), p(900), p(900), p(900)];
    const d = computeEloDeltas(t1, t2, 2); // underdogs (t2) win
    // every t2 winner gains the same positive amount; t1 loses it
    const gain = d[t2[0]!.steamid64]!;
    expect(gain).toBeGreaterThan(16);
    for (const pl of t2) expect(d[pl.steamid64]).toBe(gain);
  });
});

describe("winProbability", () => {
  it("matches expectedScore on averages", () => {
    expect(winProbability([p(1200)], [p(1000)])).toBeCloseTo(
      expectedScore(1200, 1000),
      6,
    );
  });
});
