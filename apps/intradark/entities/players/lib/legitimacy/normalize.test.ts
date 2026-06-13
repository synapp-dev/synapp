import { describe, expect, it } from "vitest";

import {
  normalizeAccountAgeYears,
  normalizeCountLog,
} from "@/entities/players/lib/legitimacy/normalize";

describe("normalize", () => {
  it("account age caps at 10 years", () => {
    expect(normalizeAccountAgeYears(0)).toBe(0);
    expect(normalizeAccountAgeYears(10)).toBeCloseTo(1, 2);
    expect(normalizeAccountAgeYears(20)).toBeCloseTo(1, 2);
  });

  it("count log diminishes returns", () => {
    const low = normalizeCountLog(10, 500);
    const high = normalizeCountLog(500, 500);
    const higher = normalizeCountLog(5000, 500);
    expect(low).toBeLessThan(high);
    expect(higher).toBeCloseTo(high, 1);
  });
});
