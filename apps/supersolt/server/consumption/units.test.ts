import { describe, expect, it } from "vitest";

import { convertQty, isCountUnit, normalizeUnit } from "@/server/consumption/units";

describe("normalizeUnit", () => {
  it("trims, lowercases and strips trailing dots", () => {
    expect(normalizeUnit(" KG. ")).toBe("kg");
    expect(normalizeUnit("Grams")).toBe("grams");
  });
});

describe("convertQty", () => {
  it("converts within the mass family", () => {
    expect(convertQty(2, "kg", "g")).toBe(2000);
    expect(convertQty(500, "g", "kg")).toBe(0.5);
    expect(convertQty(80, "g", "g")).toBe(80);
  });

  it("converts within the volume family", () => {
    expect(convertQty(1.5, "L", "ml")).toBe(1500);
    expect(convertQty(250, "ml", "l")).toBe(0.25);
  });

  it("converts count synonyms", () => {
    expect(convertQty(3, "ea", "each")).toBe(3);
    expect(convertQty(1, "dozen", "each")).toBe(12);
  });

  it("returns null across families", () => {
    expect(convertQty(1, "kg", "ml")).toBeNull();
    expect(convertQty(1, "g", "each")).toBeNull();
  });

  it("returns null for unknown units", () => {
    expect(convertQty(1, "bunch", "g")).toBeNull();
    expect(convertQty(1, "g", "bunch")).toBeNull();
  });

  it("passes identical free-text units through", () => {
    expect(convertQty(2, "bunch", "bunch")).toBe(2);
    expect(convertQty(2, "Bunch ", "bunch")).toBe(2);
  });
});

describe("isCountUnit", () => {
  it("recognises count units including empty string", () => {
    expect(isCountUnit("each")).toBe(true);
    expect(isCountUnit("serves")).toBe(true);
    expect(isCountUnit("")).toBe(true);
    expect(isCountUnit("x")).toBe(true);
  });

  it("rejects mass/volume and unknown units", () => {
    expect(isCountUnit("g")).toBe(false);
    expect(isCountUnit("ml")).toBe(false);
    expect(isCountUnit("bunch")).toBe(false);
  });
});
