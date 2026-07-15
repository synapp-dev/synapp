import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  forecasts,
  ingredientOrderBuffers,
  ingredients,
  orderGuideCache,
  organisationPurchasingSettings,
  purchaseOrderLines,
  purchaseOrders,
  recipeIngredients,
  recipes,
  supplierProducts,
  suppliers,
  venueForecastState,
} from "@/server/db/schema";

export type OrderGuideCacheRow = typeof orderGuideCache.$inferSelect;

export type SupplierProductWithSupplier = {
  id: string;
  name: string;
  supplierId: string;
  ingredientId: string | null;
  unitsPerPack: string;
  packLabel: string;
  packUnit: string;
  unitPriceCents: number;
  supplier: {
    id: string;
    name: string;
    orderingEmail: string | null;
    email: string | null;
    leadTimeDays: number;
    minimumOrderCents: number;
    deliverySchedule: unknown;
  };
};

export const orderGuideRepo = {
  async getCache(
    tx: RlsTx,
    venueId: string,
  ): Promise<OrderGuideCacheRow | null> {
    const rows = await tx
      .select()
      .from(orderGuideCache)
      .where(eq(orderGuideCache.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertCache(
    tx: RlsTx,
    row: typeof orderGuideCache.$inferInsert,
  ): Promise<void> {
    await tx
      .insert(orderGuideCache)
      .values(row)
      .onConflictDoUpdate({
        target: orderGuideCache.venueId,
        set: {
          computedAt: row.computedAt,
          forecastHorizonDays: row.forecastHorizonDays,
          periodPreset: row.periodPreset,
          suggestions: row.suggestions,
          meta: row.meta,
        },
      });
  },

  async getForecastState(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({
        forecastReady: venueForecastState.forecastReady,
        availableHistoryDays: venueForecastState.availableHistoryDays,
      })
      .from(venueForecastState)
      .where(eq(venueForecastState.venueId, venueId))
      .limit(1);
    return rows[0] ?? null;
  },

  async getDefaultBufferPercent(tx: RlsTx, organisationId: string) {
    const rows = await tx
      .select({
        defaultBufferPercent: organisationPurchasingSettings.defaultBufferPercent,
      })
      .from(organisationPurchasingSettings)
      .where(eq(organisationPurchasingSettings.organisationId, organisationId))
      .limit(1);
    return rows[0]?.defaultBufferPercent ?? null;
  },

  async listForecastsInRange(
    tx: RlsTx,
    venueId: string,
    fromDate: string,
    toDate: string,
  ) {
    return tx
      .select({
        date: forecasts.date,
        metric: forecasts.metric,
        forecastValue: forecasts.forecastValue,
      })
      .from(forecasts)
      .where(
        and(
          eq(forecasts.venueId, venueId),
          gte(forecasts.date, fromDate),
          lte(forecasts.date, toDate),
        ),
      );
  },

  async listActiveSupplierProducts(
    tx: RlsTx,
    organisationId: string,
    venueId: string,
  ): Promise<SupplierProductWithSupplier[]> {
    const rows = await tx
      .select({
        id: supplierProducts.id,
        name: supplierProducts.name,
        supplierId: supplierProducts.supplierId,
        ingredientId: supplierProducts.ingredientId,
        unitsPerPack: supplierProducts.unitsPerPack,
        packLabel: supplierProducts.packLabel,
        packUnit: supplierProducts.packUnit,
        unitPriceCents: supplierProducts.unitPriceCents,
        supplierIdJoin: suppliers.id,
        supplierName: suppliers.name,
        orderingEmail: suppliers.orderingEmail,
        email: suppliers.email,
        leadTimeDays: suppliers.leadTimeDays,
        minimumOrderCents: suppliers.minimumOrderCents,
        deliverySchedule: suppliers.deliverySchedule,
      })
      .from(supplierProducts)
      .innerJoin(suppliers, eq(suppliers.id, supplierProducts.supplierId))
      .where(
        and(
          eq(supplierProducts.organisationId, organisationId),
          eq(supplierProducts.isActiveForIngredient, true),
          isNull(supplierProducts.archivedAt),
          or(
            isNull(supplierProducts.venueId),
            eq(supplierProducts.venueId, venueId),
          ),
        ),
      );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      supplierId: r.supplierId,
      ingredientId: r.ingredientId,
      unitsPerPack: r.unitsPerPack,
      packLabel: r.packLabel,
      packUnit: r.packUnit,
      unitPriceCents: r.unitPriceCents,
      supplier: {
        id: r.supplierIdJoin,
        name: r.supplierName,
        orderingEmail: r.orderingEmail,
        email: r.email,
        leadTimeDays: r.leadTimeDays ?? 3,
        minimumOrderCents: r.minimumOrderCents ?? 0,
        deliverySchedule: r.deliverySchedule,
      },
    }));
  },

  async listSupplierSchedules(
    tx: RlsTx,
    supplierIds: string[],
  ): Promise<
    Map<string, { deliverySchedule: unknown; leadTimeDays: number }>
  > {
    if (supplierIds.length === 0) return new Map();
    const rows = await tx
      .select({
        id: suppliers.id,
        deliverySchedule: suppliers.deliverySchedule,
        leadTimeDays: suppliers.leadTimeDays,
      })
      .from(suppliers)
      .where(inArray(suppliers.id, supplierIds));
    return new Map(
      rows.map((row) => [
        row.id,
        {
          deliverySchedule: row.deliverySchedule,
          leadTimeDays: row.leadTimeDays ?? 3,
        },
      ]),
    );
  },

  async listVenueIngredients(tx: RlsTx, venueId: string) {
    return tx
      .select({
        id: ingredients.id,
        name: ingredients.name,
        unit: ingredients.unit,
        currentStockLevel: ingredients.currentStockLevel,
        category: ingredients.category,
      })
      .from(ingredients)
      .where(
        and(eq(ingredients.venueId, venueId), isNull(ingredients.archivedAt)),
      );
  },

  async listIngredientBuffers(tx: RlsTx, venueId: string) {
    return tx
      .select({
        ingredientId: ingredientOrderBuffers.ingredientId,
        bufferPercent: ingredientOrderBuffers.bufferPercent,
        excludeFromOrderGuide: ingredientOrderBuffers.excludeFromOrderGuide,
      })
      .from(ingredientOrderBuffers)
      .where(eq(ingredientOrderBuffers.venueId, venueId));
  },

  async listOpenPurchaseOrderIds(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({ id: purchaseOrders.id })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.venueId, venueId),
          inArray(purchaseOrders.status, ["submitted", "confirmed"]),
        ),
      );
    return rows.map((r) => r.id);
  },

  async listOpenPoLines(tx: RlsTx, poIds: string[]) {
    if (poIds.length === 0) {
      return [];
    }
    return tx
      .select({
        ingredientId: purchaseOrderLines.ingredientId,
        quantityOrdered: purchaseOrderLines.quantityOrdered,
        quantityReceived: purchaseOrderLines.quantityReceived,
        supplierProductId: purchaseOrderLines.supplierProductId,
      })
      .from(purchaseOrderLines)
      .where(inArray(purchaseOrderLines.poId, poIds));
  },

  async listPublishedRecipeIds(tx: RlsTx, venueId: string) {
    const rows = await tx
      .select({ id: recipes.id })
      .from(recipes)
      .where(
        and(
          eq(recipes.venueId, venueId),
          eq(recipes.status, "published"),
          isNull(recipes.archivedAt),
        ),
      );
    return rows.map((r) => r.id);
  },

  async listRecipeIngredients(tx: RlsTx, recipeIds: string[]) {
    if (recipeIds.length === 0) {
      return [];
    }
    return tx
      .select({
        ingredientId: recipeIngredients.ingredientId,
        quantity: recipeIngredients.quantity,
      })
      .from(recipeIngredients)
      .where(inArray(recipeIngredients.recipeId, recipeIds));
  },
};
