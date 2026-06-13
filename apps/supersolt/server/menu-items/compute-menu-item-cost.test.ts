import { describe, expect, it } from "vitest";
import { computeMenuItemCostFromRecipes } from "@/server/menu-items/compute-menu-item-cost";

describe("computeMenuItemCostFromRecipes", () => {
  it("sums recipe cost × quantity across links", () => {
    expect(
      computeMenuItemCostFromRecipes([
        { recipeCostPerServeCents: 120, quantity: 1 },
        { recipeCostPerServeCents: 80, quantity: 2 },
      ]),
    ).toBe(280);
  });

  it("returns 0 for no links", () => {
    expect(computeMenuItemCostFromRecipes([])).toBe(0);
  });

  it("contributes 0 for zero quantity", () => {
    expect(
      computeMenuItemCostFromRecipes([{ recipeCostPerServeCents: 500, quantity: 0 }]),
    ).toBe(0);
  });

  it("guards negative, null, and NaN costs to 0", () => {
    expect(
      computeMenuItemCostFromRecipes([
        { recipeCostPerServeCents: -100, quantity: 1 },
        { recipeCostPerServeCents: null, quantity: 2 },
        { recipeCostPerServeCents: Number.NaN, quantity: 1 },
        { recipeCostPerServeCents: 200, quantity: 1 },
      ]),
    ).toBe(200);
  });
});
