export type VenueIngredientRef = {
  id: string;
  name: string;
  unit: string;
};

export type RecipeIngredientSuggestion = {
  name: string;
  ingredientId: string | null;
  quantity: number | null;
  unit: string | null;
  confidence: number;
};

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits a Square free-text item description (typically a comma-separated list
 * of components, e.g. "Chicken Schnitzel, Rocket, Pickled Onion, Salsa Verde")
 * into candidate ingredient names. Deterministic — no LLM dependency, so it is
 * always available and never produces a 503.
 */
export function parseIngredientNamesFromDescription(description: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const part of description.split(/[,;\n]|\b and \b|&/i)) {
    const name = part.trim().replace(/\.+$/, "").trim();
    if (name.length === 0) continue;
    const key = normalise(name);
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Fuzzy-matches a candidate name against the venue's master ingredients.
 * Returns the matched ingredient (exact > substring) or null.
 */
export function matchIngredientName(
  name: string,
  venueIngredients: VenueIngredientRef[],
): { ingredient: VenueIngredientRef | null; confidence: number } {
  const target = normalise(name);
  if (target.length === 0) {
    return { ingredient: null, confidence: 0 };
  }

  let partial: VenueIngredientRef | null = null;
  for (const ingredient of venueIngredients) {
    const candidate = normalise(ingredient.name);
    if (candidate === target) {
      return { ingredient, confidence: 1 };
    }
    if (
      partial === null &&
      (candidate.includes(target) || target.includes(candidate))
    ) {
      partial = ingredient;
    }
  }

  return partial
    ? { ingredient: partial, confidence: 0.6 }
    : { ingredient: null, confidence: 0.3 };
}

export function suggestRecipeIngredientsFromDescription(args: {
  description: string | null;
  venueIngredients: VenueIngredientRef[];
}): { suggestions: RecipeIngredientSuggestion[] } {
  const description = args.description?.trim() ?? "";
  if (description.length === 0) {
    return { suggestions: [] };
  }

  const suggestions = parseIngredientNamesFromDescription(description).map(
    (name): RecipeIngredientSuggestion => {
      const { ingredient, confidence } = matchIngredientName(
        name,
        args.venueIngredients,
      );
      return {
        name: ingredient?.name ?? name,
        ingredientId: ingredient?.id ?? null,
        quantity: null,
        unit: ingredient?.unit ?? null,
        confidence,
      };
    },
  );

  return { suggestions };
}
