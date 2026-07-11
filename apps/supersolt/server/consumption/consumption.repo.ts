import { and, desc, eq, gte, inArray, isNull, lt, lte, sql } from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  consumptionExceptions,
  ingredientConsumptionDaily,
  ingredients,
  menuItemRecipes,
  menuItems,
  purchaseOrderLines,
  purchaseOrderReceivingEvents,
  purchaseOrders,
  recipeIngredients,
  recipes,
  stockCountEntries,
  stockCounts,
  venueSquareOrderLines,
  venues,
  wasteEntries,
} from "@/server/db/schema";
import type {
  MenuItemRecipeLink,
  RecipeLine,
  RecipeMeta,
} from "@/server/consumption/explosion";

export type VenueRow = {
  venueId: string;
  organisationId: string;
  timezone: string;
};

export type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
};

export type RecipeGraphRows = {
  recipeMeta: RecipeMeta[];
  recipeLines: RecipeLine[];
  menuItemLinks: MenuItemRecipeLink[];
  ingredients: IngredientRow[];
};

export type OrderLineRow = {
  menuItemId: string | null;
  matchSource: string;
  quantity: string;
  grossAmountCents: number;
  lineName: string | null;
  squareCatalogObjectId: string | null;
  observedAt: string;
};

export type DailyFactRow = {
  venueId: string;
  ingredientId: string;
  date: string;
  qtyConsumedBaseUnits: number;
  costCents: number;
  sourceRecipeCount: number;
  sourceSalesCount: number;
};

export type ExceptionRow = {
  organisationId: string;
  venueId: string;
  date: string;
  kind: string;
  menuItemId: string | null;
  recipeId: string | null;
  ingredientId: string | null;
  detail: Record<string, unknown>;
  qty: number | null;
  valueCents: number | null;
};

export const consumptionRepo = {
  async listActiveVenues(appDb: AppDb): Promise<VenueRow[]> {
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

  async loadRecipeGraph(appDb: AppDb, venueId: string): Promise<RecipeGraphRows> {
    const [recipeRows, lineRows, linkRows, ingredientRows] = await Promise.all([
      appDb.admin
        .select({ id: recipes.id, name: recipes.name, serves: recipes.serves })
        .from(recipes)
        .where(and(eq(recipes.venueId, venueId), isNull(recipes.archivedAt))),
      appDb.admin
        .select({
          recipeId: recipeIngredients.recipeId,
          ingredientId: recipeIngredients.ingredientId,
          ingredientName: recipeIngredients.ingredientName,
          quantity: recipeIngredients.quantity,
          unit: recipeIngredients.unit,
          isSubRecipe: recipeIngredients.isSubRecipe,
          subRecipeId: recipeIngredients.subRecipeId,
        })
        .from(recipeIngredients)
        .innerJoin(recipes, eq(recipes.id, recipeIngredients.recipeId))
        .where(and(eq(recipes.venueId, venueId), isNull(recipes.archivedAt))),
      appDb.admin
        .select({
          menuItemId: menuItemRecipes.menuItemId,
          recipeId: menuItemRecipes.recipeId,
          quantity: menuItemRecipes.quantity,
        })
        .from(menuItemRecipes)
        .innerJoin(menuItems, eq(menuItems.id, menuItemRecipes.menuItemId))
        .where(and(eq(menuItems.venueId, venueId), isNull(menuItems.archivedAt))),
      appDb.admin
        .select({
          id: ingredients.id,
          name: ingredients.name,
          unit: ingredients.unit,
          costPerUnitCents: ingredients.costPerUnitCents,
        })
        .from(ingredients)
        .where(and(eq(ingredients.venueId, venueId), isNull(ingredients.archivedAt))),
    ]);

    return {
      recipeMeta: recipeRows.map((r) => ({
        id: r.id,
        name: r.name,
        serves: r.serves,
      })),
      recipeLines: lineRows.map((r) => ({
        recipeId: r.recipeId,
        ingredientId: r.ingredientId,
        ingredientName: r.ingredientName,
        quantity: Number(r.quantity),
        unit: r.unit,
        isSubRecipe: r.isSubRecipe,
        subRecipeId: r.subRecipeId,
      })),
      menuItemLinks: linkRows.map((r) => ({
        menuItemId: r.menuItemId,
        recipeId: r.recipeId,
        quantity: Number(r.quantity),
      })),
      ingredients: ingredientRows,
    };
  },

  async listOrderLinesInRange(
    appDb: AppDb,
    args: { venueId: string; startIso: string; endIso: string },
  ): Promise<OrderLineRow[]> {
    return appDb.admin
      .select({
        menuItemId: venueSquareOrderLines.menuItemId,
        matchSource: venueSquareOrderLines.matchSource,
        quantity: venueSquareOrderLines.quantity,
        grossAmountCents: venueSquareOrderLines.grossAmountCents,
        lineName: venueSquareOrderLines.lineName,
        squareCatalogObjectId: venueSquareOrderLines.squareCatalogObjectId,
        observedAt: venueSquareOrderLines.observedAt,
      })
      .from(venueSquareOrderLines)
      .where(
        and(
          eq(venueSquareOrderLines.venueId, args.venueId),
          gte(venueSquareOrderLines.observedAt, args.startIso),
          lt(venueSquareOrderLines.observedAt, args.endIso),
        ),
      );
  },

  async hasFinalRowsForDate(
    appDb: AppDb,
    args: { venueId: string; date: string },
  ): Promise<boolean> {
    const rows = await appDb.admin
      .select({ id: ingredientConsumptionDaily.id })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          eq(ingredientConsumptionDaily.date, args.date),
          eq(ingredientConsumptionDaily.isFinal, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  },

  async latestComputedAtForDate(
    appDb: AppDb,
    args: { venueId: string; date: string },
  ): Promise<string | null> {
    const rows = await appDb.admin
      .select({ computedAt: ingredientConsumptionDaily.computedAt })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          eq(ingredientConsumptionDaily.date, args.date),
        ),
      )
      .orderBy(desc(ingredientConsumptionDaily.computedAt))
      .limit(1);
    return rows[0]?.computedAt ?? null;
  },

  /**
   * Replace one venue-day's facts. Non-final rows for the day are always
   * cleared first so ingredients that dropped out of the recompute don't
   * linger with stale values. Final rows are never touched — callers must
   * check hasFinalRowsForDate before finalizing.
   */
  async replaceDayFacts(
    appDb: AppDb,
    args: { venueId: string; date: string; isFinal: boolean; rows: DailyFactRow[] },
  ): Promise<number> {
    const now = new Date().toISOString();
    await appDb.admin.transaction(async (tx) => {
      await tx
        .delete(ingredientConsumptionDaily)
        .where(
          and(
            eq(ingredientConsumptionDaily.venueId, args.venueId),
            eq(ingredientConsumptionDaily.date, args.date),
            eq(ingredientConsumptionDaily.isFinal, false),
          ),
        );
      if (args.rows.length > 0) {
        await tx.insert(ingredientConsumptionDaily).values(
          args.rows.map((r) => ({
            venueId: r.venueId,
            ingredientId: r.ingredientId,
            date: r.date,
            qtyConsumedBaseUnits: String(r.qtyConsumedBaseUnits),
            costCents: r.costCents,
            sourceRecipeCount: r.sourceRecipeCount,
            sourceSalesCount: r.sourceSalesCount,
            isFinal: args.isFinal,
            computedAt: now,
          })),
        );
      }
    });
    return args.rows.length;
  },

  async replaceDayExceptions(
    appDb: AppDb,
    args: { venueId: string; date: string; rows: ExceptionRow[] },
  ): Promise<number> {
    const now = new Date().toISOString();
    await appDb.admin.transaction(async (tx) => {
      await tx
        .delete(consumptionExceptions)
        .where(
          and(
            eq(consumptionExceptions.venueId, args.venueId),
            eq(consumptionExceptions.date, args.date),
          ),
        );
      if (args.rows.length > 0) {
        await tx.insert(consumptionExceptions).values(
          args.rows.map((r) => ({
            organisationId: r.organisationId,
            venueId: r.venueId,
            date: r.date,
            kind: r.kind,
            menuItemId: r.menuItemId,
            recipeId: r.recipeId,
            ingredientId: r.ingredientId,
            detail: r.detail,
            qty: r.qty !== null ? String(r.qty) : null,
            valueCents: r.valueCents,
            computedAt: now,
          })),
        );
      }
    });
    return args.rows.length;
  },

  async listFinalDatesInRange(
    appDb: AppDb,
    args: { venueId: string; fromDate: string; toDate: string },
  ): Promise<Set<string>> {
    const rows = await appDb.admin
      .selectDistinct({ date: ingredientConsumptionDaily.date })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          gte(ingredientConsumptionDaily.date, args.fromDate),
          lte(ingredientConsumptionDaily.date, args.toDate),
          eq(ingredientConsumptionDaily.isFinal, true),
        ),
      );
    return new Set(rows.map((r) => r.date));
  },

  async listExceptionsInRange(
    tx: RlsTx,
    args: { venueId: string; fromDate: string; toDate: string },
  ) {
    return tx
      .select({
        id: consumptionExceptions.id,
        date: consumptionExceptions.date,
        kind: consumptionExceptions.kind,
        menuItemId: consumptionExceptions.menuItemId,
        recipeId: consumptionExceptions.recipeId,
        ingredientId: consumptionExceptions.ingredientId,
        detail: consumptionExceptions.detail,
        qty: consumptionExceptions.qty,
        valueCents: consumptionExceptions.valueCents,
        computedAt: consumptionExceptions.computedAt,
      })
      .from(consumptionExceptions)
      .where(
        and(
          eq(consumptionExceptions.venueId, args.venueId),
          gte(consumptionExceptions.date, args.fromDate),
          lte(consumptionExceptions.date, args.toDate),
        ),
      )
      .orderBy(desc(consumptionExceptions.date));
  },

  /**
   * Trailing average daily usage per ingredient over 14- and 28-day
   * windows ending yesterday (final facts only — today's volatile row is
   * excluded). Days without consumption count as zero via the fixed
   * window-length divisor.
   */
  async demandRates(
    tx: RlsTx,
    args: { venueId: string; endDateExclusive: string },
  ): Promise<
    Array<{
      ingredientId: string;
      qty14: number;
      qty28: number;
      avgDaily14: number;
      avgDaily28: number;
    }>
  > {
    const rows = await tx
      .select({
        ingredientId: ingredientConsumptionDaily.ingredientId,
        qty14: sql<string>`coalesce(sum(${ingredientConsumptionDaily.qtyConsumedBaseUnits}) filter (where ${ingredientConsumptionDaily.date} >= (${args.endDateExclusive}::date - interval '14 days')::date), 0)`,
        qty28: sql<string>`coalesce(sum(${ingredientConsumptionDaily.qtyConsumedBaseUnits}), 0)`,
      })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          eq(ingredientConsumptionDaily.isFinal, true),
          gte(
            ingredientConsumptionDaily.date,
            sql`(${args.endDateExclusive}::date - interval '28 days')::date`,
          ),
          lt(ingredientConsumptionDaily.date, args.endDateExclusive),
        ),
      )
      .groupBy(ingredientConsumptionDaily.ingredientId);

    return rows.map((r) => {
      const qty14 = Number(r.qty14);
      const qty28 = Number(r.qty28);
      return {
        ingredientId: r.ingredientId,
        qty14,
        qty28,
        avgDaily14: qty14 / 14,
        avgDaily28: qty28 / 28,
      };
    });
  },

  // --- stock on hand inputs -------------------------------------------------

  /** Latest approved count entry per ingredient (the SOH anchor). */
  async latestApprovedCountEntries(
    appDb: AppDb,
    venueId: string,
  ): Promise<Array<{ ingredientId: string; countedQty: number; anchorAt: string }>> {
    const rows = await appDb.admin
      .selectDistinctOn([stockCountEntries.ingredientId], {
        ingredientId: stockCountEntries.ingredientId,
        countedQty: stockCountEntries.countedQty,
        submittedAt: stockCounts.submittedAt,
        approvedAt: stockCounts.approvedAt,
      })
      .from(stockCountEntries)
      .innerJoin(stockCounts, eq(stockCounts.id, stockCountEntries.countId))
      .where(
        and(
          eq(stockCounts.venueId, venueId),
          eq(stockCounts.status, "approved"),
          sql`${stockCountEntries.countedQty} IS NOT NULL`,
          sql`${stockCounts.submittedAt} IS NOT NULL`,
        ),
      )
      .orderBy(
        stockCountEntries.ingredientId,
        desc(stockCounts.submittedAt),
      );

    return rows.map((r) => ({
      ingredientId: r.ingredientId,
      countedQty: Number(r.countedQty),
      anchorAt: (r.submittedAt ?? r.approvedAt) as string,
    }));
  },

  /** Received PO quantities per ingredient since an ISO timestamp. */
  async receiptsSince(
    appDb: AppDb,
    args: { venueId: string; sinceIso: string },
  ): Promise<Array<{ ingredientId: string; qty: number; receivedAt: string }>> {
    const rows = await appDb.admin
      .select({
        ingredientId: purchaseOrderLines.ingredientId,
        qty: purchaseOrderLines.quantityReceived,
        receivedAt: purchaseOrderReceivingEvents.receivedAt,
      })
      .from(purchaseOrderLines)
      .innerJoin(purchaseOrders, eq(purchaseOrders.id, purchaseOrderLines.poId))
      .innerJoin(
        purchaseOrderReceivingEvents,
        eq(purchaseOrderReceivingEvents.poId, purchaseOrders.id),
      )
      .where(
        and(
          eq(purchaseOrders.venueId, args.venueId),
          gte(purchaseOrderReceivingEvents.receivedAt, args.sinceIso),
        ),
      );

    return rows
      .filter((r) => r.ingredientId !== null)
      .map((r) => ({
        ingredientId: r.ingredientId as string,
        qty: Number(r.qty ?? 0),
        receivedAt: r.receivedAt,
      }));
  },

  /** Ingredient-level consumption facts since a date (inclusive). */
  async consumptionSince(
    appDb: AppDb,
    args: { venueId: string; fromDate: string },
  ): Promise<Array<{ ingredientId: string; date: string; qty: number }>> {
    const rows = await appDb.admin
      .select({
        ingredientId: ingredientConsumptionDaily.ingredientId,
        date: ingredientConsumptionDaily.date,
        qty: ingredientConsumptionDaily.qtyConsumedBaseUnits,
      })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          gte(ingredientConsumptionDaily.date, args.fromDate),
        ),
      );
    return rows.map((r) => ({
      ingredientId: r.ingredientId,
      date: r.date,
      qty: Number(r.qty),
    }));
  },

  /** Ingredient-level waste (direct entries + batch-explosion children). */
  async wasteSince(
    appDb: AppDb,
    args: { venueId: string; sinceIso: string },
  ): Promise<Array<{ ingredientId: string; qtyBaseUnits: number; occurredAt: string }>> {
    const rows = await appDb.admin
      .select({
        ingredientId: wasteEntries.ingredientId,
        qtyBaseUnits: wasteEntries.qtyBaseUnits,
        occurredAt: wasteEntries.occurredAt,
      })
      .from(wasteEntries)
      .where(
        and(
          eq(wasteEntries.venueId, args.venueId),
          gte(wasteEntries.occurredAt, args.sinceIso),
          sql`${wasteEntries.ingredientId} IS NOT NULL`,
          sql`${wasteEntries.qtyBaseUnits} IS NOT NULL`,
        ),
      );
    return rows.map((r) => ({
      ingredientId: r.ingredientId as string,
      qtyBaseUnits: Number(r.qtyBaseUnits),
      occurredAt: r.occurredAt,
    }));
  },

  async listVenueIngredients(
    appDb: AppDb,
    venueId: string,
  ): Promise<IngredientRow[]> {
    return appDb.admin
      .select({
        id: ingredients.id,
        name: ingredients.name,
        unit: ingredients.unit,
        costPerUnitCents: ingredients.costPerUnitCents,
      })
      .from(ingredients)
      .where(and(eq(ingredients.venueId, venueId), isNull(ingredients.archivedAt)));
  },

  async updateIngredientStockLevels(
    appDb: AppDb,
    updates: Array<{ ingredientId: string; level: number }>,
  ): Promise<number> {
    if (updates.length === 0) return 0;
    await appDb.admin.transaction(async (tx) => {
      for (const u of updates) {
        await tx
          .update(ingredients)
          .set({
            currentStockLevel: String(u.level),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(ingredients.id, u.ingredientId));
      }
    });
    return updates.length;
  },

  async listIngredientsByIds(
    appDb: AppDb,
    ids: string[],
  ): Promise<IngredientRow[]> {
    if (ids.length === 0) return [];
    return appDb.admin
      .select({
        id: ingredients.id,
        name: ingredients.name,
        unit: ingredients.unit,
        costPerUnitCents: ingredients.costPerUnitCents,
      })
      .from(ingredients)
      .where(inArray(ingredients.id, ids));
  },
};
