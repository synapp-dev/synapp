import type { RequestAuthContext } from "@/server/auth/context";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { assertInventorySetupWriteAccess } from "@/server/inventory-setup/inventory-setup-auth";
import { ingredientsRepo } from "@/server/ingredients/ingredients.repo";
import { computeMenuItemCostFromRecipes } from "@/server/menu-items/compute-menu-item-cost";
import { menuItemsRepo } from "@/server/menu-items/menu-items.repo";
import { computeGpPercent } from "@/server/menu-items/menu-items.service";
import {
  type RecipeIngredientSuggestion,
  suggestRecipeIngredientsFromDescription,
} from "@/server/pos-catalog-import/suggest-recipe-ingredients.service";
import {
  type GroupModifierListDetail,
  posCatalogGroupsRepo,
} from "@/server/pos-catalog-import/pos-catalog-groups.repo";
import { posCatalogImportRepo } from "@/server/pos-catalog-import/pos-catalog-import.repo";
import { computeMissingFromSquare } from "@/server/inventory-setup/map-square-catalog-to-menu-drafts";

export class PosCatalogImportServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new PosCatalogImportServiceError(404, message),
    forbidden: (auth) => new PosCatalogImportServiceError(auth.status, auth.message),
  });
}

export const posCatalogImportService = {
  async listPosItems(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls(async (tx) => {
      const seenIds = await posCatalogImportRepo.getLastCompletedSquareImportSeenIds(
        tx,
        scope.venueId,
      );
      const linkedIds = await posCatalogImportRepo.listLinkedCatalogObjectIds(tx, scope.venueId);
      const missing = computeMissingFromSquare({
        linkedCatalogObjectIds: linkedIds,
        seenCatalogObjectIds: seenIds,
      });

      const rows = await posCatalogImportRepo.listPosSetupRows(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        missingCatalogObjectIds: missing,
      });

      const posImportRan = await posCatalogImportRepo.hasCompletedSquareImport(tx, scope.venueId);
      const inUseMenuItemCount = await posCatalogImportRepo.countInUseWithSquareLink(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
      const mappedInUseCount = await posCatalogImportRepo.countMappedInUse(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });

      return {
        rows,
        summary: {
          posImportRan,
          inUseMenuItemCount,
          mappedInUseCount,
        },
      };
    });
  },

  async getMenuItemModifiers(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; menuItemId: string },
  ): Promise<{ groupId: string | null; lists: GroupModifierListDetail[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    return ctx.appDb.rls(async (tx) => {
      const menuItem = await menuItemsRepo.getMenuItemById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      });
      if (!menuItem) {
        throw new PosCatalogImportServiceError(404, "POS item not found");
      }
      if (!menuItem.groupId) {
        return { groupId: null, lists: [] };
      }

      const lists = await posCatalogGroupsRepo.listGroupModifiers(tx, {
        groupId: menuItem.groupId,
      });
      return { groupId: menuItem.groupId, lists };
    });
  },

  async getRecipeIngredientSuggestions(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; menuItemId: string },
  ): Promise<{ suggestions: RecipeIngredientSuggestion[] }> {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);

    const result = await ctx.appDb.rls(async (tx) => {
      const menuItem = await menuItemsRepo.getMenuItemById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      });
      if (!menuItem) {
        throw new PosCatalogImportServiceError(404, "POS item not found");
      }

      const description = menuItem.groupId
        ? await posCatalogGroupsRepo.getGroupDescription(tx, {
            groupId: menuItem.groupId,
          })
        : null;

      if (!description || description.trim().length === 0) {
        return { suggestions: [] as RecipeIngredientSuggestion[] };
      }

      const { rows } = await ingredientsRepo.listIngredients(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        page: 1,
        pageSize: 1000,
      });

      return suggestRecipeIngredientsFromDescription({
        description,
        venueIngredients: rows.map((row) => ({
          id: row.id,
          name: row.name,
          unit: row.unit,
        })),
      });
    });

    console.info("[pos-catalog-import] ingredient_suggest", {
      menuItemId: args.menuItemId,
      hasDescription: result.suggestions.length > 0,
      suggestionCount: result.suggestions.length,
      matchedCount: result.suggestions.filter((s) => s.ingredientId !== null).length,
    });

    return result;
  },

  async updateShowOnMenu(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      showOnMenu: boolean;
    },
  ) {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const updated = await ctx.appDb.rls((tx) =>
      menuItemsRepo.updateMenuItem(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
        row: {
          showOnMenu: args.showOnMenu,
          updatedAt: new Date().toISOString(),
        },
      }),
    );

    if (!updated) {
      throw new PosCatalogImportServiceError(404, "POS item not found");
    }

    return updated;
  },

  async mapRecipe(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      menuItemId: string;
      recipeId: string | null;
    },
  ) {
    const scope = await resolveScope(ctx, args.organisationSlug, args.venueSlug);
    assertInventorySetupWriteAccess(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const recompute = await ctx.appDb.rls(async (tx) => {
      const menuItem = await menuItemsRepo.getMenuItemById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
      });
      if (!menuItem) {
        throw new PosCatalogImportServiceError(404, "POS item not found");
      }

      if (args.recipeId) {
        const recipes = await menuItemsRepo.listScopedRecipesByIds(tx, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          recipeIds: [args.recipeId],
        });
        if (recipes.length === 0) {
          throw new PosCatalogImportServiceError(404, "Recipe not found for this venue");
        }
        await menuItemsRepo.replaceComponents(tx, args.menuItemId, [
          { recipeId: args.recipeId, quantity: 1 },
        ]);
      } else {
        await menuItemsRepo.replaceComponents(tx, args.menuItemId, []);
      }

      const components = await menuItemsRepo.listComponentsForMenuItem(
        tx,
        args.menuItemId,
      );
      const costPerServeCents = computeMenuItemCostFromRecipes(components);
      const gpPercent = Math.round(
        computeGpPercent(menuItem.priceCents, costPerServeCents),
      );

      await menuItemsRepo.updateMenuItem(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        menuItemId: args.menuItemId,
        row: {
          costPerServeCents,
          gpPercent,
          updatedAt: new Date().toISOString(),
        },
      });

      return { costPerServeCents, gpPercent };
    });

    console.info("[pos-catalog-import] recipe_mapped", {
      menuItemId: args.menuItemId,
      recipeId: args.recipeId,
      costPerServeCents: recompute.costPerServeCents,
      gpPercent: recompute.gpPercent,
    });

    if (args.recipeId && recompute.costPerServeCents === 0) {
      console.info("[pos-catalog-import] recipe_cost_incomplete", {
        menuItemId: args.menuItemId,
        recipeId: args.recipeId,
      });
    }
  },
};
