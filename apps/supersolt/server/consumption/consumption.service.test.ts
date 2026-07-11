import { describe, expect, it } from "vitest";

import { computeDayAggregation } from "@/server/consumption/consumption.service";
import type {
  OrderLineRow,
  RecipeGraphRows,
} from "@/server/consumption/consumption.repo";

const GRAPH: RecipeGraphRows = {
  recipeMeta: [{ id: "flat-white", name: "Flat White", serves: 1 }],
  recipeLines: [
    {
      recipeId: "flat-white",
      ingredientId: "milk",
      ingredientName: "Milk",
      quantity: 150,
      unit: "ml",
      isSubRecipe: false,
      subRecipeId: null,
    },
    {
      recipeId: "flat-white",
      ingredientId: "beans",
      ingredientName: "Coffee Beans",
      quantity: 18,
      unit: "g",
      isSubRecipe: false,
      subRecipeId: null,
    },
  ],
  menuItemLinks: [{ menuItemId: "mi-fw", recipeId: "flat-white", quantity: 1 }],
  ingredients: [
    { id: "milk", name: "Milk", unit: "ml", costPerUnitCents: 0.2 },
    { id: "beans", name: "Coffee Beans", unit: "g", costPerUnitCents: 4 },
  ],
};

function orderLine(partial: Partial<OrderLineRow>): OrderLineRow {
  return {
    menuItemId: "mi-fw",
    matchSource: "catalog_link",
    quantity: "1",
    grossAmountCents: 500,
    lineName: "Flat White",
    squareCatalogObjectId: "sq-fw",
    observedAt: "2026-07-10T01:00:00.000Z",
    ...partial,
  };
}

describe("computeDayAggregation", () => {
  it("aggregates mapped sales into costed facts", () => {
    const { facts, exceptions } = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [orderLine({ quantity: "2" }), orderLine({ quantity: "1" })],
      graphRows: GRAPH,
    });

    expect(exceptions).toEqual([]);
    const milk = facts.find((f) => f.ingredientId === "milk");
    const beans = facts.find((f) => f.ingredientId === "beans");
    expect(milk?.qtyConsumedBaseUnits).toBeCloseTo(450);
    expect(milk?.costCents).toBe(90);
    expect(beans?.qtyConsumedBaseUnits).toBeCloseTo(54);
    expect(beans?.costCents).toBe(216);
  });

  it("still consumes for $0 comps — quantity drives consumption, not price", () => {
    const { facts } = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [orderLine({ grossAmountCents: 0 })],
      graphRows: GRAPH,
    });
    expect(
      facts.find((f) => f.ingredientId === "milk")?.qtyConsumedBaseUnits,
    ).toBeCloseTo(150);
  });

  it("captures unmapped sales as exceptions with qty and $ value", () => {
    const { facts, exceptions } = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [
        orderLine({
          menuItemId: null,
          matchSource: "unmapped",
          lineName: "Mystery Special",
          squareCatalogObjectId: "sq-mystery",
          quantity: "3",
          grossAmountCents: 2700,
        }),
        orderLine({
          menuItemId: null,
          matchSource: "unmapped",
          lineName: "Mystery Special",
          squareCatalogObjectId: "sq-mystery",
          quantity: "1",
          grossAmountCents: 900,
        }),
      ],
      graphRows: GRAPH,
    });

    expect(facts).toEqual([]);
    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({
      kind: "unmapped_sale",
      qty: 4,
      valueCents: 3600,
    });
  });

  it("treats a mapped menu item with no recipe links as unmapped", () => {
    const { facts, exceptions } = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [
        orderLine({ menuItemId: "mi-unknown", matchSource: "name_exact" }),
      ],
      graphRows: GRAPH,
    });
    expect(facts).toEqual([]);
    expect(exceptions.some((e) => e.kind === "unmapped_sale")).toBe(true);
  });

  it("only surfaces menu-item recipe exceptions for items that sold", () => {
    const graphWithBroken: RecipeGraphRows = {
      ...GRAPH,
      recipeMeta: [
        ...GRAPH.recipeMeta,
        { id: "broken", name: "Broken", serves: 1 },
      ],
      menuItemLinks: [
        ...GRAPH.menuItemLinks,
        { menuItemId: "mi-broken", recipeId: "broken", quantity: 1 },
      ],
    };

    const soldOnlyFlatWhite = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [orderLine({})],
      graphRows: graphWithBroken,
    });
    expect(
      soldOnlyFlatWhite.exceptions.some((e) => e.menuItemId === "mi-broken"),
    ).toBe(false);

    const soldBroken = computeDayAggregation({
      venueId: "v1",
      organisationId: "o1",
      date: "2026-07-10",
      orderLines: [orderLine({ menuItemId: "mi-broken" })],
      graphRows: graphWithBroken,
    });
    expect(
      soldBroken.exceptions.some(
        (e) => e.kind === "empty_recipe" && e.menuItemId === "mi-broken",
      ),
    ).toBe(true);
  });
});
