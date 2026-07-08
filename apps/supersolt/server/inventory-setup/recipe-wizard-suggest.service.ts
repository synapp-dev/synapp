import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { menuItemsRepo } from "@/server/menu-items/menu-items.repo";
import { posCatalogGroupsRepo } from "@/server/pos-catalog-import/pos-catalog-groups.repo";
import { suggestRecipeIngredientsFromDescription } from "@/server/pos-catalog-import/suggest-recipe-ingredients.service";
import {
  computeCostPerServeCents,
  resolveSuggestedLines,
  type ResolvedRecipeLine,
  type WizardCatalogIngredient,
} from "@/server/inventory-setup/recipe-wizard-mapping";

export class RecipeWizardSuggestServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type RecipeWizardSuggestion = {
  serves: number;
  confidence: "high" | "medium" | "low";
  notes: string | null;
  /** True when the LLM was unavailable and lines came from the deterministic parser. */
  fallbackUsed: boolean;
  lines: ResolvedRecipeLine[];
  estimatedCostPerServeCents: number;
};

// Optional over nullable throughout: Anthropic structured output caps a schema
// at 16 union-typed params and every nullable field is a union (see the invoice
// parse schema for the same constraint).
const llmLineSchema = z.object({
  catalogIndex: z
    .number()
    .int()
    .optional()
    .describe(
      "Index into the provided ingredient catalog. Omit ONLY when no catalog entry plausibly matches this component.",
    ),
  name: z.string().describe("Component name as it appears in the dish"),
  quantity: z
    .number()
    .positive()
    .describe(
      "Amount for ONE serve, expressed in the catalog ingredient's own unit when catalogIndex is set (e.g. unit kg → 0.15 for 150 g), otherwise in a sensible metric unit.",
    ),
  unit: z
    .string()
    .describe("Unit for the quantity — must equal the catalog unit when catalogIndex is set"),
});

const llmSuggestionSchema = z.object({
  serves: z.number().int().positive().describe("Serves this recipe yields — 1 for a menu dish"),
  lines: z.array(llmLineSchema),
  notes: z.string().optional().describe("One short sentence on assumptions made, if any"),
  confidence: z.enum(["high", "medium", "low"]),
});

function buildCatalogPrompt(catalog: WizardCatalogIngredient[]): string {
  return catalog
    .map(
      (ingredient, index) =>
        `${index}. ${ingredient.name} — unit: ${ingredient.unit}, cost: $${(ingredient.costPerUnitCents / 100).toFixed(2)} per ${ingredient.unit}`,
    )
    .join("\n");
}

async function callSuggestLlm(args: {
  itemName: string;
  sectionName: string;
  priceCents: number;
  description: string | null;
  catalog: WizardCatalogIngredient[];
  vary: boolean;
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new RecipeWizardSuggestServiceError(503, "ANTHROPIC_API_KEY is not configured");
  }

  const { object } = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: llmSuggestionSchema,
    temperature: args.vary ? 0.7 : 0.2,
    providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
    messages: [
      {
        role: "user",
        content:
          "You help an Australian hospitality venue draft the recipe behind a POS menu item, so every sale can be costed against stock.\n\n" +
          `Menu item: ${args.itemName}\n` +
          `Menu section: ${args.sectionName || "(none)"}\n` +
          `Sell price: $${(args.priceCents / 100).toFixed(2)}\n` +
          `POS description: ${args.description?.trim() || "(none — infer typical components from the item name)"}\n\n` +
          "Venue ingredient catalog (index. name — unit, cost):\n" +
          buildCatalogPrompt(args.catalog) +
          "\n\n" +
          "Rules:\n" +
          "- List this dish's components as recipe lines for ONE serve (serves: 1) unless the item is clearly a batch.\n" +
          "- For each line, pick the best catalogIndex. Prefer a close catalog match over omitting; omit catalogIndex only when nothing fits.\n" +
          "- quantity must be in the catalog ingredient's own unit (unit kg → 0.15 means 150 g; unit each → count; unit L → litres).\n" +
          "- Sanity-check against the sell price and ingredient costs: a single serve's ingredients should cost well under the sell price.\n" +
          "- Skip water, ice and negligible seasoning unless they're in the catalog.\n" +
          (args.vary
            ? "- The user wants a different reading than last time — offer an alternative plausible composition.\n"
            : "") +
          "Be conservative with confidence when the description is missing or vague.",
      },
    ],
  });

  return object;
}

export const recipeWizardSuggestService = {
  async suggest(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      regenerate?: boolean;
    },
  ): Promise<RecipeWizardSuggestion> {
    const scope = await resolveVenueScopeForService(
      ctx,
      args.organisationSlug,
      args.venueSlug,
      {
        notFound: (message) => new RecipeWizardSuggestServiceError(404, message),
        forbidden: (auth) =>
          new RecipeWizardSuggestServiceError(auth.status, auth.message),
      },
    );

    const { menuItem, description, catalog } = await ctx.appDb.rls(async (tx) => {
      const item = await menuItemsRepo.getMenuItemById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      });
      if (!item) {
        throw new RecipeWizardSuggestServiceError(404, "POS item not found");
      }

      const groupDescription = item.groupId
        ? await posCatalogGroupsRepo.getGroupDescription(tx, { groupId: item.groupId })
        : null;

      // Active only — matching a deactivated duplicate would draft lines the
      // wizard's (active-only) ingredient picker can't display.
      const { rows } = await ingredientsRepo.listIngredients(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        status: "active",
        page: 1,
        pageSize: 1000,
      });

      return {
        menuItem: item,
        description: groupDescription,
        catalog: rows.map(
          (row): WizardCatalogIngredient => ({
            id: row.id,
            name: row.name,
            unit: row.unit,
            costPerUnitCents: row.costPerUnitCents ?? 0,
          }),
        ),
      };
    });

    if (catalog.length === 0) {
      throw new RecipeWizardSuggestServiceError(
        409,
        "No ingredients yet — normalise supplier items before building recipes",
      );
    }

    try {
      const llm = await callSuggestLlm({
        itemName: menuItem.name,
        sectionName: menuItem.sectionName ?? "",
        priceCents: menuItem.priceCents,
        description,
        catalog,
        vary: args.regenerate === true,
      });

      const lines = resolveSuggestedLines(llm.lines, catalog);
      const serves = Math.max(1, Math.floor(llm.serves || 1));
      const suggestion: RecipeWizardSuggestion = {
        serves,
        confidence: llm.confidence,
        notes: llm.notes?.trim() || null,
        fallbackUsed: false,
        lines,
        estimatedCostPerServeCents: computeCostPerServeCents(lines, serves),
      };

      console.info("[recipe-wizard] suggest", {
        menuItemId: args.menuItemId,
        lineCount: lines.length,
        matchedCount: lines.filter((l) => l.matched).length,
        confidence: llm.confidence,
        fallbackUsed: false,
      });

      return suggestion;
    } catch (error) {
      if (error instanceof RecipeWizardSuggestServiceError && error.status === 503) {
        throw error;
      }

      // LLM misbehaved (schema mismatch, transient API error): degrade to the
      // deterministic description parser — no quantities, but still a start.
      const { suggestions } = suggestRecipeIngredientsFromDescription({
        description,
        venueIngredients: catalog.map(({ id, name, unit }) => ({ id, name, unit })),
      });
      const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
      const lines: ResolvedRecipeLine[] = suggestions.map((s) => {
        const ingredient = s.ingredientId ? byId.get(s.ingredientId) : undefined;
        return {
          ingredientId: ingredient?.id ?? null,
          name: s.name,
          quantity: null,
          unit: ingredient?.unit ?? s.unit ?? "each",
          unitCostCents: ingredient?.costPerUnitCents ?? 0,
          matched: Boolean(ingredient),
        };
      });

      console.warn("[recipe-wizard] suggest_fallback", {
        menuItemId: args.menuItemId,
        reason: error instanceof Error ? error.message : String(error),
        lineCount: lines.length,
      });

      return {
        serves: 1,
        confidence: "low",
        notes: null,
        fallbackUsed: true,
        lines,
        estimatedCostPerServeCents: 0,
      };
    }
  },
};
