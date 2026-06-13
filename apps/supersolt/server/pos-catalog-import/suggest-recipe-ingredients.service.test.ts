import { describe, expect, it } from "vitest";
import {
  matchIngredientName,
  parseIngredientNamesFromDescription,
  suggestRecipeIngredientsFromDescription,
  type VenueIngredientRef,
} from "@/server/pos-catalog-import/suggest-recipe-ingredients.service";

const venueIngredients: VenueIngredientRef[] = [
  { id: "ing-rocket", name: "Rocket", unit: "g" },
  { id: "ing-onion", name: "Pickled Onion", unit: "g" },
];

describe("parseIngredientNamesFromDescription", () => {
  it("parses a comma-separated list into candidate names", () => {
    expect(
      parseIngredientNamesFromDescription(
        "Chicken Schnitzel, Rocket, Pickled Onion, Salsa Verde",
      ),
    ).toEqual(["Chicken Schnitzel", "Rocket", "Pickled Onion", "Salsa Verde"]);
  });

  it("splits on 'and' / ampersand and dedupes", () => {
    expect(
      parseIngredientNamesFromDescription("Rocket and Parmesan & Rocket"),
    ).toEqual(["Rocket", "Parmesan"]);
  });
});

describe("matchIngredientName", () => {
  it("matches exactly (confidence 1) and returns the master id", () => {
    const result = matchIngredientName("rocket", venueIngredients);
    expect(result.ingredient?.id).toBe("ing-rocket");
    expect(result.confidence).toBe(1);
  });

  it("returns null id when no match", () => {
    const result = matchIngredientName("Salsa Verde", venueIngredients);
    expect(result.ingredient).toBeNull();
  });
});

describe("suggestRecipeIngredientsFromDescription", () => {
  it("maps each parsed name, linking matched ingredients to their master id", () => {
    const { suggestions } = suggestRecipeIngredientsFromDescription({
      description: "Rocket, Salsa Verde",
      venueIngredients,
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      name: "Rocket",
      ingredientId: "ing-rocket",
      unit: "g",
    });
    expect(suggestions[1]).toMatchObject({
      name: "Salsa Verde",
      ingredientId: null,
    });
  });

  it("returns empty suggestions when there is no description", () => {
    expect(
      suggestRecipeIngredientsFromDescription({
        description: null,
        venueIngredients,
      }),
    ).toEqual({ suggestions: [] });
    expect(
      suggestRecipeIngredientsFromDescription({
        description: "   ",
        venueIngredients,
      }),
    ).toEqual({ suggestions: [] });
  });
});
