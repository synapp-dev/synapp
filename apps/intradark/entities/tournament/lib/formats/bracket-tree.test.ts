import { describe, expect, it } from "vitest";

import {
  buildSingleElim,
  byeAdvancements,
  nextPowerOfTwo,
  seedSlots,
} from "./bracket-tree";

describe("nextPowerOfTwo", () => {
  it("rounds up", () => {
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
  });
});

describe("seedSlots", () => {
  it("standard seeding orders", () => {
    expect(seedSlots(2)).toEqual([1, 2]);
    expect(seedSlots(4)).toEqual([1, 4, 2, 3]);
    expect(seedSlots(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe("buildSingleElim", () => {
  it("4 entrants → 2 semis + 1 final, top seed plays bottom seed", () => {
    const t = buildSingleElim(4);
    expect(t.size).toBe(4);
    expect(t.rounds).toBe(2);
    const r1 = t.matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(2);
    // seed 0 (top) vs seed 3 (bottom) in match 0
    expect(r1[0]!.homeSeed).toBe(0);
    expect(r1[0]!.awaySeed).toBe(3);
    expect(t.matches.filter((m) => m.round === 2)).toHaveLength(1);
    // final has no next
    expect(t.matches.find((m) => m.round === 2)!.nextRound).toBeNull();
  });

  it("wires winners into the next round", () => {
    const t = buildSingleElim(4);
    const semi0 = t.matches.find((m) => m.round === 1 && m.index === 0)!;
    expect(semi0.nextRound).toBe(2);
    expect(semi0.nextIndex).toBe(0);
    expect(semi0.nextSlot).toBe("home");
    const semi1 = t.matches.find((m) => m.round === 1 && m.index === 1)!;
    expect(semi1.nextSlot).toBe("away");
  });

  it("byes go to the top seeds (6 entrants in an 8 bracket)", () => {
    const t = buildSingleElim(6);
    expect(t.size).toBe(8);
    const byes = byeAdvancements(t);
    // seeds 6,7 (0-based) don't exist → seeds 0 and 1 get byes
    const advancing = new Set([...byes.values()]);
    expect(advancing.has(0)).toBe(true); // top seed
    expect(advancing.has(1)).toBe(true); // 2nd seed
    expect(advancing.size).toBe(2);
  });
});
