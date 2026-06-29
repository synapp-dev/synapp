import { describe, expect, it } from "vitest";

import { splitPool } from "./prize-split";

describe("splitPool", () => {
  it("50/30/20 of 1000", () => {
    expect(splitPool(1000, [50, 30, 20])).toEqual([500, 300, 200]);
  });
  it("sums exactly to the pool (remainder to the top)", () => {
    const out = splitPool(1000, [1, 1, 1]);
    expect(out.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(out[0]).toBeGreaterThanOrEqual(out[1]!);
  });
  it("handles zero pool", () => {
    expect(splitPool(0, [50, 50])).toEqual([0, 0]);
  });
  it("normalizes arbitrary weights", () => {
    expect(splitPool(900, [2, 1])).toEqual([600, 300]);
  });
});
