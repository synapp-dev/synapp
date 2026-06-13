import { describe, expect, it } from "vitest";

import { buildPackUnitLines, convertMixedUnitsToBase } from "./mixed-unit-convert";

describe("mixed-unit-convert", () => {
  it("converts cartons + bottles + partial to base units", () => {
    const result = buildPackUnitLines({
      cartons: 2,
      unitsPerCarton: 12,
      looseUnits: 3,
      partialBaseUnits: 0.5,
    });
    expect(result.totalBaseUnits).toBe(27.5);
  });

  it("rejects negative quantities", () => {
    expect(() =>
      convertMixedUnitsToBase([
        { unitKey: "unit", quantity: -1, multiplierToBase: 1 },
      ]),
    ).toThrow("Negative quantity");
  });
});
