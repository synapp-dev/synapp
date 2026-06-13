import { describe, expect, it } from "vitest";
import {
  buildRecipePrefillFromPosLine,
  mapSectionNameToRecipeCategory,
} from "@/entities/pos-catalog-import/model/recipe-prefill";
import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";

describe("mapSectionNameToRecipeCategory", () => {
  it("maps drink/dessert/side/prep keywords", () => {
    expect(mapSectionNameToRecipeCategory("Hot Drinks")).toBe("drinks");
    expect(mapSectionNameToRecipeCategory("Desserts")).toBe("desserts");
    expect(mapSectionNameToRecipeCategory("Sides")).toBe("sides");
    expect(mapSectionNameToRecipeCategory("Prep / Base")).toBe("prep");
  });

  it("defaults to other for unknown or mains", () => {
    expect(mapSectionNameToRecipeCategory("Mains")).toBe("other");
    expect(mapSectionNameToRecipeCategory("Specials")).toBe("other");
  });
});

describe("buildRecipePrefillFromPosLine", () => {
  it("carries name verbatim and price → suggestedPriceCents with mapped category", () => {
    const row: PosCatalogImportRow = {
      menuItemId: "mi-1",
      name: "Flat White",
      sectionName: "Coffee",
      groupId: null,
      groupName: null,
      description: null,
      priceCents: 550,
      showOnMenu: true,
      status: "active",
      squareCatalogObjectId: "var-1",
      recipeId: null,
      recipeName: null,
      costPerServeCents: null,
      gpPercent: null,
      recipeCostIncomplete: false,
      modifierListCount: 0,
      missingFromSquare: false,
    };

    expect(buildRecipePrefillFromPosLine(row)).toEqual({
      name: "Flat White",
      category: "drinks",
      suggestedPriceCents: 550,
    });
  });
});
