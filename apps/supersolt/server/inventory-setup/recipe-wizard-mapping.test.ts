import { describe, expect, it } from "vitest";
import {
  computeCostPerServeCents,
  resolveSuggestedLines,
  type WizardCatalogIngredient,
} from "@/server/inventory-setup/recipe-wizard-mapping";

const CATALOG: WizardCatalogIngredient[] = [
  { id: "ing-bread", name: "Ciabatta Roll", unit: "each", costPerUnitCents: 123 },
  { id: "ing-chicken", name: "Chicken Marinated", unit: "each", costPerUnitCents: 270 },
  { id: "ing-oil", name: "Garlic Oil", unit: "L", costPerUnitCents: 1000 },
];

describe("resolveSuggestedLines", () => {
  it("resolves catalog indexes to real ingredients with their unit and cost", () => {
    const lines = resolveSuggestedLines(
      [{ catalogIndex: 1, name: "chicken schnitzel", quantity: 1, unit: "piece" }],
      CATALOG,
    );
    expect(lines).toEqual([
      {
        ingredientId: "ing-chicken",
        name: "Chicken Marinated",
        quantity: 1,
        unit: "each",
        unitCostCents: 270,
        matched: true,
      },
    ]);
  });

  it("keeps unmatched lines as free text with zero cost", () => {
    const lines = resolveSuggestedLines(
      [{ name: "Rocket", quantity: 20, unit: "g" }],
      CATALOG,
    );
    expect(lines[0]).toMatchObject({
      ingredientId: null,
      name: "Rocket",
      unitCostCents: 0,
      matched: false,
    });
  });

  it("drops out-of-range indexes to unmatched instead of crashing", () => {
    const lines = resolveSuggestedLines(
      [{ catalogIndex: 99, name: "Mystery", quantity: 1, unit: "each" }],
      CATALOG,
    );
    expect(lines[0]?.matched).toBe(false);
    expect(lines[0]?.ingredientId).toBeNull();
  });

  it("folds duplicate catalog hits into the first occurrence", () => {
    const lines = resolveSuggestedLines(
      [
        { catalogIndex: 0, name: "bread", quantity: 1, unit: "each" },
        { catalogIndex: 0, name: "roll", quantity: 2, unit: "each" },
      ],
      CATALOG,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(1);
  });

  it("drops non-positive and non-finite quantities and blank unmatched names", () => {
    const lines = resolveSuggestedLines(
      [
        { catalogIndex: 0, name: "bread", quantity: 0, unit: "each" },
        { catalogIndex: 1, name: "chicken", quantity: Number.NaN, unit: "each" },
        { name: "   ", quantity: 2, unit: "g" },
      ],
      CATALOG,
    );
    expect(lines).toHaveLength(0);
  });
});

describe("computeCostPerServeCents", () => {
  it("sums quantity × unit cost across lines", () => {
    // 1 roll ($1.23) + 1 chicken ($2.70) + 0.01 L garlic oil ($10.00/L = 10c)
    expect(
      computeCostPerServeCents(
        [
          { quantity: 1, unitCostCents: 123 },
          { quantity: 1, unitCostCents: 270 },
          { quantity: 0.01, unitCostCents: 1000 },
        ],
        1,
      ),
    ).toBe(403);
  });

  it("divides by serves and treats null quantities as zero", () => {
    expect(
      computeCostPerServeCents(
        [
          { quantity: 4, unitCostCents: 100 },
          { quantity: null, unitCostCents: 999 },
        ],
        4,
      ),
    ).toBe(100);
  });

  it("guards against zero/garbage serves", () => {
    expect(computeCostPerServeCents([{ quantity: 1, unitCostCents: 100 }], 0)).toBe(100);
  });
});
