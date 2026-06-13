import { describe, expect, it } from "vitest";
import { computeCostPerBaseUnitCents } from "@/server/inventory-normalisation/compute-cost-per-base-unit";

describe("computeCostPerBaseUnitCents", () => {
  it("computes $32 / 10 kg as 320 cents per kg", () => {
    const result = computeCostPerBaseUnitCents({
      unitPriceCents: 3200,
      unitsPerPack: 10,
      packUnit: "kg",
    });
    expect(result.costPerBaseUnitCents).toBe(320);
    expect(result.packUnit).toBe("kg");
  });

  it("rejects zero unitsPerPack", () => {
    expect(() =>
      computeCostPerBaseUnitCents({
        unitPriceCents: 1000,
        unitsPerPack: 0,
        packUnit: "each",
      }),
    ).toThrow("unitsPerPack must be greater than zero");
  });
});
