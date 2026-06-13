import { describe, expect, it } from "vitest";

import {
  computeExpectedQty,
  computeVariance,
  sumConsumptionInWindow,
} from "./variance-compute";

describe("variance-compute", () => {
  it("computes expected = prev + receipts - consumption", () => {
    expect(
      computeExpectedQty({
        previousCountQty: 20,
        receiptsBaseUnits: 10,
        consumptionBaseUnits: 5,
        isBaseline: false,
      }),
    ).toBe(25);
  });

  it("returns null expected for baseline", () => {
    expect(
      computeVariance({
        previousCountQty: null,
        receiptsBaseUnits: 0,
        consumptionBaseUnits: 0,
        countedQty: 10,
        costPerUnitCents: 100,
        isBaseline: true,
        trackVariance: true,
      }).expectedQty,
    ).toBeNull();
  });

  it("computes signed variance and cents", () => {
    const result = computeVariance({
      previousCountQty: 22,
      receiptsBaseUnits: 0,
      consumptionBaseUnits: 0,
      countedQty: 8,
      costPerUnitCents: 120,
      isBaseline: false,
      trackVariance: true,
    });
    expect(result.varianceQty).toBe(-14);
    expect(result.varianceCents).toBe(-1680);
  });

  it("sums consumption rows in window", () => {
    expect(
      sumConsumptionInWindow(
        [
          { date: "2026-05-01", qtyConsumedBaseUnits: 2 },
          { date: "2026-05-03", qtyConsumedBaseUnits: 3 },
          { date: "2026-05-10", qtyConsumedBaseUnits: 99 },
        ],
        "2026-05-01",
        "2026-05-05",
      ),
    ).toBe(5);
  });
});
