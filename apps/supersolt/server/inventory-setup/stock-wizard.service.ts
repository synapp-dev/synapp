import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { z } from "zod";

import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { storageLocationsRepo } from "@/server/stock-counts/storage-locations.repo";

export class StockWizardServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type StockWizardSuggestRow = {
  ingredientId: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
  currentStockLevel: number;
  suggestedQty: number;
  locationId: string | null;
  locationName: string | null;
  /** True when suggestedQty/location echo an existing saved count (review). */
  saved: boolean;
};

export type StockWizardSuggestResponse = {
  category: string;
  rows: StockWizardSuggestRow[];
  locations: Array<{ id: string; name: string }>;
};

const llmSchema = z.object({
  items: z.array(
    z.object({
      ingredientId: z.string(),
      openingQty: z.coerce
        .number()
        .describe("Typical on-hand quantity in the ingredient's own unit"),
      locationName: z
        .string()
        .describe("EXACTLY one of the provided storage location names"),
    }),
  ),
});

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new StockWizardServiceError(404, message),
    forbidden: (auth) => new StockWizardServiceError(auth.status, auth.message),
  });
}

export const stockWizardService = {
  /**
   * LLM-drafted opening stock for one ingredient category: a realistic on-hand
   * quantity per ingredient (in its own unit) and the storage location it most
   * plausibly lives in, picked from the venue's actual locations.
   */
  async suggest(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; category: string },
  ): Promise<StockWizardSuggestResponse> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const { ingredients, locations, existingLocations } = await ctx.appDb.rls(
      async (tx) => {
        const { rows } = await ingredientsRepo.listIngredients(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          status: "active",
          category: args.category,
          page: 1,
          pageSize: 1000,
        });
        const locationRows = await storageLocationsRepo.listForVenue(tx, scope.venueId);
        const existing = await storageLocationsRepo.listPrimaryForIngredients(
          tx,
          rows.map((row) => row.id),
        );
        return { ingredients: rows, locations: locationRows, existingLocations: existing };
      },
    );

    if (locations.length === 0) {
      throw new StockWizardServiceError(
        409,
        "Add at least one storage location before counting stock",
      );
    }

    const locationList = locations.map((l) => ({ id: l.id, name: l.name }));
    if (ingredients.length === 0) {
      return { category: args.category, rows: [], locations: locationList };
    }

    // Already-counted rows keep their saved values (review pass) — the LLM only
    // drafts for ingredients that have never been counted.
    const needsSuggestion = ingredients.filter(
      (row) => Number(row.currentStockLevel ?? 0) <= 0,
    );

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    const byName = new Map(locationList.map((l) => [l.name.trim().toLowerCase(), l]));
    const suggestions = new Map<string, { qty: number; locationId: string | null; locationName: string | null }>();

    if (apiKey && needsSuggestion.length > 0) {
      try {
        const { object } = await generateObject({
          model: anthropic("claude-haiku-4-5"),
          schema: llmSchema,
          temperature: 0.2,
          providerOptions: { anthropic: { structuredOutputMode: "jsonTool" } },
          messages: [
            {
              role: "user",
              content:
                "You are drafting OPENING STOCK counts for a busy Australian panini bar / café doing its first stocktake.\n" +
                `Storage locations at this venue: ${locationList.map((l) => l.name).join(", ")}.\n\n` +
                "For each ingredient, return openingQty — a realistic on-hand amount IN THE INGREDIENT'S OWN UNIT (unit kg → kilograms on hand; each → count on hand; L → litres) — and locationName, the storage location it most plausibly lives in (cold items → coolroom/fridge; frozen → freezer; packaged/dry → dry store; packaging & takeaway gear → front counter or dry store).\n" +
                "Scale sensibly: a week's trade for perishables, a few weeks for dry goods, bulk counts for packaging (hundreds of cups, not thousands of kilograms).\n\n" +
                "Ingredients:\n" +
                needsSuggestion
                  .map(
                    (row) =>
                      `- ingredientId ${row.id} | ${row.name} | unit: ${row.unit} | cost $${((row.costPerUnitCents ?? 0) / 100).toFixed(2)}/${row.unit}`,
                  )
                  .join("\n"),
            },
          ],
        });

        for (const item of object.items) {
          const qty = Number(item.openingQty);
          if (!Number.isFinite(qty) || qty < 0) continue;
          const location = byName.get(item.locationName?.trim().toLowerCase() ?? "") ?? null;
          suggestions.set(item.ingredientId, {
            qty: Math.round(qty * 100) / 100,
            locationId: location?.id ?? null,
            locationName: location?.name ?? null,
          });
        }
      } catch (error) {
        console.warn("[stock-wizard] suggest_llm_failed", {
          category: args.category,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const fallbackLocation = locationList[0] ?? null;
    const byId = new Map(locationList.map((l) => [l.id, l]));
    const rows: StockWizardSuggestRow[] = ingredients.map((row) => {
      const saved = Number(row.currentStockLevel ?? 0) > 0;
      const suggestion = suggestions.get(row.id);
      const locationId =
        existingLocations.get(row.id) ??
        suggestion?.locationId ??
        fallbackLocation?.id ??
        null;
      return {
        ingredientId: row.id,
        name: row.name,
        unit: row.unit,
        costPerUnitCents: row.costPerUnitCents ?? 0,
        currentStockLevel: Number(row.currentStockLevel ?? 0),
        suggestedQty: saved ? Number(row.currentStockLevel ?? 0) : (suggestion?.qty ?? 0),
        locationId,
        locationName: locationId ? (byId.get(locationId)?.name ?? null) : null,
        saved,
      };
    });

    console.info("[stock-wizard] suggest", {
      category: args.category,
      ingredientCount: ingredients.length,
      savedCount: rows.filter((r) => r.saved).length,
      llmHits: suggestions.size,
    });

    return { category: args.category, rows, locations: locationList };
  },

  /**
   * Bulk-applies counted stock: sets each ingredient's current stock level and
   * pins its primary storage location. One call per wizard step, not one per row.
   */
  async apply(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      items: Array<{ ingredientId: string; quantity: number; locationId: string | null }>;
    },
  ): Promise<{ updated: number }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    let updated = 0;
    await ctx.appDb.rls(async (tx) => {
      const venueLocations = await storageLocationsRepo.listForVenue(tx, scope.venueId);
      const validLocationIds = new Set(venueLocations.map((l) => l.id));

      for (const item of args.items) {
        const quantity = Number(item.quantity);
        if (!Number.isFinite(quantity) || quantity < 0) continue;

        const existing = await ingredientsRepo.getIngredientById(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          ingredientId: item.ingredientId,
        });
        if (!existing) continue;

        await ingredientsRepo.updateIngredient(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          ingredientId: item.ingredientId,
          row: {
            currentStockLevel: String(quantity),
            updatedBy: ctx.userId,
            updatedAt: new Date().toISOString(),
          },
        });

        if (item.locationId && validLocationIds.has(item.locationId)) {
          await storageLocationsRepo.setIngredientLocations(tx, {
            ingredientId: item.ingredientId,
            locationIds: [item.locationId],
            primaryLocationId: item.locationId,
          });
        }
        updated += 1;
      }
    });

    console.info("[stock-wizard] apply", { updated, requested: args.items.length });
    return { updated };
  },
};
