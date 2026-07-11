import { describe, expect, it } from "vitest";

import {
  buildMenuItemBoms,
  explodeRecipeToRaw,
  type ExplosionGraph,
  type RecipeLine,
  type RecipeMeta,
} from "@/server/consumption/explosion";

function graphOf(args: {
  recipes: RecipeMeta[];
  lines: RecipeLine[];
  ingredientUnits: Record<string, string>;
}): ExplosionGraph {
  const linesByRecipe = new Map<string, RecipeLine[]>();
  for (const line of args.lines) {
    const list = linesByRecipe.get(line.recipeId) ?? [];
    list.push(line);
    linesByRecipe.set(line.recipeId, list);
  }
  return {
    linesByRecipe,
    recipeMetaById: new Map(args.recipes.map((r) => [r.id, r])),
    ingredientUnitById: new Map(Object.entries(args.ingredientUnits)),
  };
}

function line(partial: Partial<RecipeLine> & { recipeId: string }): RecipeLine {
  return {
    ingredientId: null,
    ingredientName: "",
    quantity: 0,
    unit: "g",
    isSubRecipe: false,
    subRecipeId: null,
    ...partial,
  };
}

// The spec's core flow: a Reuben Panini (1 roll [batch], 80g pastrami,
// 30g kraut) selling 30x lands consumption on flour/yeast/butter through
// the roll's formula, plus pastrami 2.4kg and kraut 0.9kg. No "roll"
// stock moves because none exists.
describe("recursive batch explosion (Reuben Panini)", () => {
  const rollBatch: RecipeMeta = { id: "roll", name: "Bread Rolls", serves: 20 };
  const reuben: RecipeMeta = { id: "reuben", name: "Reuben Panini", serves: 1 };

  const graph = graphOf({
    recipes: [rollBatch, reuben],
    lines: [
      // roll batch formula: makes 20 rolls
      line({ recipeId: "roll", ingredientId: "flour", quantity: 2000, unit: "g" }),
      line({ recipeId: "roll", ingredientId: "yeast", quantity: 40, unit: "g" }),
      line({ recipeId: "roll", ingredientId: "butter", quantity: 200, unit: "g" }),
      // reuben: 1 roll + toppings
      line({
        recipeId: "reuben",
        isSubRecipe: true,
        subRecipeId: "roll",
        quantity: 1,
        unit: "each",
      }),
      line({ recipeId: "reuben", ingredientId: "pastrami", quantity: 80, unit: "g" }),
      line({ recipeId: "reuben", ingredientId: "kraut", quantity: 30, unit: "g" }),
    ],
    ingredientUnits: {
      flour: "g",
      yeast: "g",
      butter: "g",
      pastrami: "g",
      kraut: "g",
    },
  });

  it("explodes batch lines to raws with per-serve division", () => {
    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "reuben",
      multiplier: 30,
      graph,
    });

    expect(exceptions).toEqual([]);
    expect(raws.get("pastrami")).toBeCloseTo(2400);
    expect(raws.get("kraut")).toBeCloseTo(900);
    // 30 sandwiches x 1 roll each = 30/20 of the batch formula
    expect(raws.get("flour")).toBeCloseTo(3000);
    expect(raws.get("yeast")).toBeCloseTo(60);
    expect(raws.get("butter")).toBeCloseTo(300);
    // no batch-level stock movement
    expect(raws.has("roll")).toBe(false);
  });

  it("converts recipe units to the ingredient base unit", () => {
    const kgGraph = graphOf({
      recipes: [reuben],
      lines: [
        line({ recipeId: "reuben", ingredientId: "pastrami", quantity: 80, unit: "g" }),
      ],
      ingredientUnits: { pastrami: "kg" },
    });
    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "reuben",
      multiplier: 30,
      graph: kgGraph,
    });
    expect(exceptions).toEqual([]);
    expect(raws.get("pastrami")).toBeCloseTo(2.4);
  });
});

describe("nested batches", () => {
  it("resolves batches within batches", () => {
    const graph = graphOf({
      recipes: [
        { id: "sauce", name: "House Sauce", serves: 10 },
        { id: "mayo", name: "Mayo Base", serves: 5 },
        { id: "burger", name: "Burger", serves: 1 },
      ],
      lines: [
        line({ recipeId: "mayo", ingredientId: "egg", quantity: 10, unit: "each" }),
        line({
          recipeId: "sauce",
          isSubRecipe: true,
          subRecipeId: "mayo",
          quantity: 2,
          unit: "serves",
        }),
        line({
          recipeId: "burger",
          isSubRecipe: true,
          subRecipeId: "sauce",
          quantity: 1,
          unit: "each",
        }),
      ],
      ingredientUnits: { egg: "each" },
    });

    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "burger",
      multiplier: 10,
      graph,
    });
    expect(exceptions).toEqual([]);
    // 10 burgers x (1/10 sauce batch) x (2/5 mayo batch) x 10 eggs = 4
    expect(raws.get("egg")).toBeCloseTo(4);
  });
});

describe("exception capture — never silently drop", () => {
  it("flags recipe cycles instead of looping", () => {
    const graph = graphOf({
      recipes: [
        { id: "a", name: "A", serves: 1 },
        { id: "b", name: "B", serves: 1 },
      ],
      lines: [
        line({ recipeId: "a", isSubRecipe: true, subRecipeId: "b", quantity: 1, unit: "each" }),
        line({ recipeId: "b", isSubRecipe: true, subRecipeId: "a", quantity: 1, unit: "each" }),
      ],
      ingredientUnits: {},
    });
    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "a",
      multiplier: 1,
      graph,
    });
    expect(raws.size).toBe(0);
    expect(exceptions.some((e) => e.kind === "recipe_cycle")).toBe(true);
  });

  it("flags unconvertible units and skips the line", () => {
    const graph = graphOf({
      recipes: [{ id: "r", name: "R", serves: 1 }],
      lines: [
        line({ recipeId: "r", ingredientId: "milk", quantity: 100, unit: "g" }),
        line({ recipeId: "r", ingredientId: "beans", quantity: 20, unit: "g" }),
      ],
      ingredientUnits: { milk: "ml", beans: "g" },
    });
    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "r",
      multiplier: 1,
      graph,
    });
    expect(raws.has("milk")).toBe(false);
    expect(raws.get("beans")).toBe(20);
    expect(
      exceptions.some(
        (e) => e.kind === "unit_conversion_failure" && e.ingredientId === "milk",
      ),
    ).toBe(true);
  });

  it("flags batch quantities not expressed in serves", () => {
    const graph = graphOf({
      recipes: [
        { id: "sauce", name: "Sauce", serves: 10 },
        { id: "dish", name: "Dish", serves: 1 },
      ],
      lines: [
        line({ recipeId: "sauce", ingredientId: "tomato", quantity: 1000, unit: "g" }),
        line({
          recipeId: "dish",
          isSubRecipe: true,
          subRecipeId: "sauce",
          quantity: 200,
          unit: "g",
        }),
      ],
      ingredientUnits: { tomato: "g" },
    });
    const { raws, exceptions } = explodeRecipeToRaw({
      recipeId: "dish",
      multiplier: 1,
      graph,
    });
    expect(raws.size).toBe(0);
    expect(
      exceptions.some(
        (e) =>
          e.kind === "unit_conversion_failure" &&
          e.detail.reason === "batch_quantity_not_in_serves",
      ),
    ).toBe(true);
  });

  it("flags menu items whose recipes explode to nothing", () => {
    const graph = graphOf({
      recipes: [{ id: "empty", name: "Empty", serves: 1 }],
      lines: [],
      ingredientUnits: {},
    });
    const { bomByMenuItem, exceptions } = buildMenuItemBoms({
      links: [{ menuItemId: "mi-1", recipeId: "empty", quantity: 1 }],
      graph,
    });
    expect(bomByMenuItem.get("mi-1")?.size).toBe(0);
    expect(
      exceptions.some((e) => e.kind === "empty_recipe" && e.menuItemId === "mi-1"),
    ).toBe(true);
  });
});
