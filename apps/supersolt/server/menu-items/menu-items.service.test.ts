import { describe, expect, it } from "vitest";
import { computeGpPercent } from "@/server/menu-items/menu-items.service";

describe("computeGpPercent", () => {
  it("computes gross profit percentage", () => {
    expect(computeGpPercent(1000, 300)).toBe(70);
  });

  it("returns 0 when price is zero or negative", () => {
    expect(computeGpPercent(0, 300)).toBe(0);
    expect(computeGpPercent(-100, 50)).toBe(0);
  });

  it("returns a negative percentage when cost exceeds price", () => {
    expect(computeGpPercent(100, 150)).toBe(-50);
  });
});
