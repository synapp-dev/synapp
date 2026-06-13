import { describe, expect, it } from "vitest";
import { computeSuggestion, roundUpToPack } from "./order-guide.compute";

describe("order-guide.compute", () => {
  it("roundUpToPack rounds up to whole packs", () => {
    expect(roundUpToPack(10, 12)).toBe(1);
    expect(roundUpToPack(13, 12)).toBe(2);
    expect(roundUpToPack(0, 12)).toBe(0);
  });

  it("computeSuggestion applies buffer and stock math", () => {
    const result = computeSuggestion({
      ingredientId: "ing1",
      ingredientName: "Milk",
      supplierId: "sup1",
      supplierName: "Bidfood",
      supplierProductId: "sp1",
      supplierProductName: "Milk 1L carton",
      unitPriceCents: 1200,
      unitsPerPack: 12,
      packLabel: "carton",
      packUnit: "L",
      baseUnit: "L",
      forecastedDemandBaseUnits: 12,
      currentStockBaseUnits: 3,
      pendingDeliveriesBaseUnits: 0,
      bufferPercent: 15,
      minimumOrderCents: 0,
      supplierSubtotalCents: 0,
    });

    expect(result).not.toBeNull();
    expect(result!.suggestedPackQuantity).toBeGreaterThan(0);
    expect(result!.breakdown.needBaseUnits).toBeGreaterThan(0);
  });
});
