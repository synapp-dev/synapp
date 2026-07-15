import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  ingredientConsumptionDaily,
  menuItemRecipes,
  recipeIngredients,
  recipes,
  venueSquareOrderLines,
  venues,
} from "@/server/db/schema";

export type BomLine = {
  menuItemId: string;
  ingredientId: string;
  qtyPerUnitSold: number;
};

export const consumptionDailyRepo = {
  async listVenuesWithSales(appDb: AppDb): Promise<
    Array<{ venueId: string; organisationId: string; timezone: string }>
  > {
    const rows = await appDb.admin
      .select({
        venueId: venues.id,
        organisationId: venues.organisationId,
        timezone: venues.timezone,
      })
      .from(venues)
      .where(isNull(venues.archivedAt));
    return rows.map((r) => ({
      venueId: r.venueId,
      organisationId: r.organisationId,
      timezone: r.timezone ?? "Australia/Melbourne",
    }));
  },

  async loadBomForVenue(
    appDb: AppDb,
    venueId: string,
  ): Promise<BomLine[]> {
    const rows = await appDb.admin
      .select({
        menuItemId: menuItemRecipes.menuItemId,
        ingredientId: recipeIngredients.ingredientId,
        menuQty: menuItemRecipes.quantity,
        recipeQty: recipeIngredients.quantity,
      })
      .from(menuItemRecipes)
      .innerJoin(recipes, eq(recipes.id, menuItemRecipes.recipeId))
      .innerJoin(recipeIngredients, eq(recipeIngredients.recipeId, recipes.id))
      .where(
        and(
          eq(recipes.venueId, venueId),
          isNull(recipes.archivedAt),
          eq(recipeIngredients.isSubRecipe, false),
          sql`${recipeIngredients.ingredientId} IS NOT NULL`,
        ),
      );

    return rows
      .filter((r) => r.ingredientId)
      .map((r) => ({
        menuItemId: r.menuItemId,
        ingredientId: r.ingredientId!,
        qtyPerUnitSold: Number(r.menuQty) * Number(r.recipeQty),
      }));
  },

  async listOrderLinesInRange(
    appDb: AppDb,
    args: { venueId: string; startIso: string; endIso: string },
  ) {
    return appDb.admin
      .select({
        menuItemId: venueSquareOrderLines.menuItemId,
        quantity: venueSquareOrderLines.quantity,
        observedAt: venueSquareOrderLines.observedAt,
        matchSource: venueSquareOrderLines.matchSource,
      })
      .from(venueSquareOrderLines)
      .where(
        and(
          eq(venueSquareOrderLines.venueId, args.venueId),
          gte(venueSquareOrderLines.observedAt, args.startIso),
          lte(venueSquareOrderLines.observedAt, args.endIso),
          sql`${venueSquareOrderLines.menuItemId} IS NOT NULL`,
        ),
      );
  },

  async upsertDailyRows(
    appDb: AppDb,
    rows: Array<{
      venueId: string;
      ingredientId: string;
      date: string;
      qtyConsumedBaseUnits: number;
      sourceRecipeCount: number;
      sourceSalesCount: number;
    }>,
  ): Promise<number> {
    if (rows.length === 0) return 0;
    const now = new Date().toISOString();
    await appDb.admin
      .insert(ingredientConsumptionDaily)
      .values(
        rows.map((r) => ({
          venueId: r.venueId,
          ingredientId: r.ingredientId,
          date: r.date,
          qtyConsumedBaseUnits: String(r.qtyConsumedBaseUnits),
          sourceRecipeCount: r.sourceRecipeCount,
          sourceSalesCount: r.sourceSalesCount,
          computedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [
          ingredientConsumptionDaily.venueId,
          ingredientConsumptionDaily.ingredientId,
          ingredientConsumptionDaily.date,
        ],
        set: {
          qtyConsumedBaseUnits: sql`excluded.qty_consumed_base_units`,
          sourceRecipeCount: sql`excluded.source_recipe_count`,
          sourceSalesCount: sql`excluded.source_sales_count`,
          computedAt: sql`excluded.computed_at`,
        },
      });
    return rows.length;
  },

  async refreshWindowForVenueRls(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<number> {
    // Rls path delegates to admin via appDb in service
    void tx;
    void args;
    return 0;
  },
};
