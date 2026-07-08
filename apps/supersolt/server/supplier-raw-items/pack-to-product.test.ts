import { describe, expect, it } from "vitest";

import { packToCatalogFields, toPackUnit } from "@/server/supplier-raw-items/pack-to-product";

describe("toPackUnit", () => {
  it("maps measures and falls back to each", () => {
    expect(toPackUnit("kg")).toBe("kg");
    expect(toPackUnit("lt")).toBe("L");
    expect(toPackUnit("ml")).toBe("mL");
    expect(toPackUnit("pack")).toBe("each");
    expect(toPackUnit(null)).toBe("each");
  });
});

describe("packToCatalogFields", () => {
  it("a plain 5kg bag → 5 kg total", () => {
    expect(packToCatalogFields({ uom: "kg", magnitude: 5, packCount: null })).toEqual({
      packUnit: "kg",
      unitsPerPack: 5,
      portionSize: 5,
      portionUnit: "kg",
    });
  });

  it("a 1.9kg × 6 case → 11.4 kg total", () => {
    const f = packToCatalogFields({ uom: "kg", magnitude: 1.9, packCount: 6 });
    expect(f.packUnit).toBe("kg");
    expect(f.unitsPerPack).toBeCloseTo(11.4);
    expect(f.portionSize).toBe(1.9);
  });

  it("a 1lt × 8 carton → 8 L total", () => {
    expect(packToCatalogFields({ uom: "lt", magnitude: 1, packCount: 8 })).toEqual({
      packUnit: "L",
      unitsPerPack: 8,
      portionSize: 1,
      portionUnit: "L",
    });
  });

  it("no measure → counted in each", () => {
    expect(packToCatalogFields({ uom: null, magnitude: null, packCount: 6 })).toEqual({
      packUnit: "each",
      unitsPerPack: 6,
      portionSize: null,
      portionUnit: null,
    });
  });
});
