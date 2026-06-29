import { describe, expect, it } from "vitest";

import { buildDoubleElim, isPowerOfTwo } from "./double-elim";

describe("buildDoubleElim", () => {
  it("rejects non-power-of-two and tiny fields", () => {
    expect(() => buildDoubleElim(3)).toThrow();
    expect(() => buildDoubleElim(6)).toThrow();
    expect(() => buildDoubleElim(2)).toThrow();
    expect(isPowerOfTwo(8)).toBe(true);
    expect(isPowerOfTwo(6)).toBe(false);
  });

  it("n=4: WB 3 + LB 2 + GF 1 = 6 matches (2n-2 + GF)", () => {
    const t = buildDoubleElim(4);
    expect(t.filter((m) => m.bracket === "wb")).toHaveLength(3);
    expect(t.filter((m) => m.bracket === "lb")).toHaveLength(2);
    expect(t.filter((m) => m.bracket === "gf")).toHaveLength(1);
  });

  it("n=8: WB 7 + LB 6 + GF 1", () => {
    const t = buildDoubleElim(8);
    expect(t.filter((m) => m.bracket === "wb")).toHaveLength(7);
    expect(t.filter((m) => m.bracket === "lb")).toHaveLength(6);
    expect(t.filter((m) => m.bracket === "gf")).toHaveLength(1);
  });

  it("every WB match routes its loser into the LB (except none orphaned)", () => {
    const t = buildDoubleElim(8);
    const keys = new Set(t.map((m) => m.key));
    for (const m of t.filter((x) => x.bracket === "wb")) {
      expect(m.loserTo).not.toBeNull();
      expect(keys.has(m.loserTo!)).toBe(true);
    }
  });

  it("WB final and LB final both feed the grand final", () => {
    const t = buildDoubleElim(8);
    const wbFinal = t.find((m) => m.bracket === "wb" && m.winnerTo === "gf");
    const lbFinal = t.find((m) => m.bracket === "lb" && m.winnerTo === "gf");
    expect(wbFinal!.winnerSlot).toBe("home");
    expect(lbFinal!.winnerSlot).toBe("away");
  });

  it("all winner/loser targets reference real matches", () => {
    const t = buildDoubleElim(8);
    const keys = new Set(t.map((m) => m.key));
    for (const m of t) {
      if (m.winnerTo) expect(keys.has(m.winnerTo)).toBe(true);
      if (m.loserTo) expect(keys.has(m.loserTo)).toBe(true);
    }
  });
});
