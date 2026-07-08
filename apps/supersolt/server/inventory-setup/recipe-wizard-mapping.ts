/**
 * Pure resolution logic for the products recipe wizard: turns raw LLM output
 * (catalog indexes + free-text lines) into validated, costed recipe lines
 * against the venue's real ingredient catalog. No DB or network — testable.
 */

export type WizardCatalogIngredient = {
  id: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
};

export type RawSuggestedLine = {
  /** Index into the catalog list given to the model; omitted = no match. */
  catalogIndex?: number;
  name: string;
  quantity: number;
  unit: string;
};

export type ResolvedRecipeLine = {
  ingredientId: string | null;
  name: string;
  /** Null when the source couldn't quantify (deterministic fallback). */
  quantity: number | null;
  unit: string;
  unitCostCents: number;
  matched: boolean;
};

/**
 * Resolves raw model lines against the catalog: valid catalogIndex → the real
 * ingredient (its unit and cost win over the model's wording, since quantities
 * are asked for in the ingredient's own unit); anything else stays an
 * unmatched free-text line for the user to place. Duplicate catalog hits fold
 * into the first occurrence; blank names and non-positive quantities drop.
 */
export function resolveSuggestedLines(
  raw: RawSuggestedLine[],
  catalog: WizardCatalogIngredient[],
): ResolvedRecipeLine[] {
  const lines: ResolvedRecipeLine[] = [];
  const seenIngredientIds = new Set<string>();

  for (const line of raw) {
    const name = line.name?.trim() ?? "";
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const ingredient =
      line.catalogIndex != null &&
      Number.isInteger(line.catalogIndex) &&
      line.catalogIndex >= 0 &&
      line.catalogIndex < catalog.length
        ? catalog[line.catalogIndex]!
        : null;

    if (ingredient) {
      if (seenIngredientIds.has(ingredient.id)) continue;
      seenIngredientIds.add(ingredient.id);
      lines.push({
        ingredientId: ingredient.id,
        name: ingredient.name,
        quantity,
        unit: ingredient.unit,
        unitCostCents: ingredient.costPerUnitCents,
        matched: true,
      });
      continue;
    }

    if (name.length === 0) continue;
    lines.push({
      ingredientId: null,
      name,
      quantity,
      unit: line.unit?.trim() || "each",
      unitCostCents: 0,
      matched: false,
    });
  }

  return lines;
}

/**
 * Cost of one serve in cents from quantified matched lines — unmatched lines
 * cost 0 until the user attaches an ingredient. Mirrors the recipe editor's
 * sum(quantity × unitCost) / serves semantics.
 */
export function computeCostPerServeCents(
  lines: Array<Pick<ResolvedRecipeLine, "quantity" | "unitCostCents">>,
  serves: number,
): number {
  const safeServes = Math.max(1, Math.floor(serves || 1));
  const total = lines.reduce(
    (sum, line) => sum + (line.quantity ?? 0) * line.unitCostCents,
    0,
  );
  return Math.round(total / safeServes);
}
