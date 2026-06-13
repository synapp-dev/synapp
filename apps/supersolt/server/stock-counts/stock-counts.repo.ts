import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";

import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import {
  ingredientConsumptionDaily,
  ingredients,
  organisationPurchasingSettings,
  purchaseOrderLines,
  purchaseOrderReceivingEvents,
  purchaseOrders,
  stockCountAuditEvents,
  stockCountEntries,
  stockCounts,
  stockCountVarianceEvents,
  supplierProducts,
} from "@/server/db/schema";

export type StockCountRow = typeof stockCounts.$inferSelect;
export type StockCountEntryRow = typeof stockCountEntries.$inferSelect;

export const stockCountsRepo = {
  async listCounts(
    tx: RlsTx,
    args: {
      venueId: string;
      status?: string;
    },
  ): Promise<StockCountRow[]> {
    const conditions: SQL[] = [eq(stockCounts.venueId, args.venueId)];
    if (args.status && args.status !== "all") {
      conditions.push(eq(stockCounts.status, args.status));
    }
    return tx
      .select()
      .from(stockCounts)
      .where(and(...conditions))
      .orderBy(desc(stockCounts.createdAt));
  },

  async getLastApprovedAt(tx: RlsTx, venueId: string): Promise<string | null> {
    const rows = await tx
      .select({ approvedAt: stockCounts.approvedAt })
      .from(stockCounts)
      .where(
        and(eq(stockCounts.venueId, venueId), eq(stockCounts.status, "approved")),
      )
      .orderBy(desc(stockCounts.approvedAt))
      .limit(1);
    return rows[0]?.approvedAt ?? null;
  },

  async getCountById(
    tx: RlsTx,
    args: { venueId: string; countId: string },
  ): Promise<StockCountRow | null> {
    const rows = await tx
      .select()
      .from(stockCounts)
      .where(
        and(eq(stockCounts.id, args.countId), eq(stockCounts.venueId, args.venueId)),
      )
      .limit(1);
    return rows[0] ?? null;
  },

  async insertCount(
    tx: RlsTx,
    row: typeof stockCounts.$inferInsert,
  ): Promise<StockCountRow> {
    const inserted = await tx.insert(stockCounts).values(row).returning();
    const created = inserted[0];
    if (!created) throw new Error("Failed to create stock count");
    return created;
  },

  async updateCount(
    tx: RlsTx,
    countId: string,
    patch: Partial<typeof stockCounts.$inferInsert>,
  ): Promise<StockCountRow> {
    const updated = await tx
      .update(stockCounts)
      .set({ ...patch, updatedAt: new Date().toISOString() })
      .where(eq(stockCounts.id, countId))
      .returning();
    const row = updated[0];
    if (!row) throw new Error("Stock count not found");
    return row;
  },

  async listEntriesForCount(
    tx: RlsTx,
    countId: string,
  ): Promise<
    Array<
      StockCountEntryRow & {
        ingredientName: string;
        ingredientUnit: string;
        category: string;
        costPerUnitCents: number;
        unitsPerPack: string | null;
        packLabel: string | null;
      }
    >
  > {
    return tx
      .select({
        id: stockCountEntries.id,
        countId: stockCountEntries.countId,
        ingredientId: stockCountEntries.ingredientId,
        locationId: stockCountEntries.locationId,
        previousCountQty: stockCountEntries.previousCountQty,
        expectedQty: stockCountEntries.expectedQty,
        countedQty: stockCountEntries.countedQty,
        unitUsed: stockCountEntries.unitUsed,
        mixedUnitBreakdown: stockCountEntries.mixedUnitBreakdown,
        varianceQty: stockCountEntries.varianceQty,
        varianceCents: stockCountEntries.varianceCents,
        notes: stockCountEntries.notes,
        photoUrls: stockCountEntries.photoUrls,
        needsVerification: stockCountEntries.needsVerification,
        isRecountRequired: stockCountEntries.isRecountRequired,
        isSkipped: stockCountEntries.isSkipped,
        isRowComplete: stockCountEntries.isRowComplete,
        countedByUserId: stockCountEntries.countedByUserId,
        countedAt: stockCountEntries.countedAt,
        updatedAt: stockCountEntries.updatedAt,
        ingredientName: ingredients.name,
        ingredientUnit: ingredients.unit,
        category: ingredients.category,
        costPerUnitCents: ingredients.costPerUnitCents,
        unitsPerPack: supplierProducts.unitsPerPack,
        packLabel: supplierProducts.packLabel,
      })
      .from(stockCountEntries)
      .innerJoin(ingredients, eq(ingredients.id, stockCountEntries.ingredientId))
      .leftJoin(
        supplierProducts,
        and(
          eq(supplierProducts.ingredientId, ingredients.id),
          eq(supplierProducts.isActiveForIngredient, true),
          isNull(supplierProducts.archivedAt),
        ),
      )
      .where(eq(stockCountEntries.countId, countId))
      .orderBy(ingredients.name);
  },

  async upsertEntry(
    tx: RlsTx,
    args: {
      countId: string;
      ingredientId: string;
      patch: Partial<typeof stockCountEntries.$inferInsert>;
    },
  ): Promise<StockCountEntryRow> {
    const existing = await tx
      .select()
      .from(stockCountEntries)
      .where(
        and(
          eq(stockCountEntries.countId, args.countId),
          eq(stockCountEntries.ingredientId, args.ingredientId),
        ),
      )
      .limit(1);

    if (existing[0]) {
      const updated = await tx
        .update(stockCountEntries)
        .set({ ...args.patch, updatedAt: new Date().toISOString() })
        .where(eq(stockCountEntries.id, existing[0].id))
        .returning();
      const row = updated[0];
      if (!row) throw new Error("Failed to update entry");
      return row;
    }

    const inserted = await tx
      .insert(stockCountEntries)
      .values({
        countId: args.countId,
        ingredientId: args.ingredientId,
        ...args.patch,
      })
      .returning();
    const row = inserted[0];
    if (!row) throw new Error("Failed to insert entry");
    return row;
  },

  async bulkInsertEntries(
    tx: RlsTx,
    rows: Array<typeof stockCountEntries.$inferInsert>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await tx.insert(stockCountEntries).values(rows);
  },

  async listActiveIngredients(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      ingredientIds?: string[];
      categories?: string[];
    },
  ) {
    const conditions: SQL[] = [
      eq(ingredients.organisationId, args.organisationId),
      eq(ingredients.venueId, args.venueId),
      isNull(ingredients.archivedAt),
      eq(ingredients.isActive, true),
    ];
    if (args.ingredientIds?.length) {
      conditions.push(inArray(ingredients.id, args.ingredientIds));
    }
    if (args.categories?.length) {
      conditions.push(inArray(ingredients.category, args.categories));
    }
    return tx.select().from(ingredients).where(and(...conditions));
  },

  async countActiveIngredients(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
    },
  ): Promise<number> {
    const rows = await tx
      .select({ value: sql<number>`count(*)::int` })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.organisationId, args.organisationId),
          eq(ingredients.venueId, args.venueId),
          isNull(ingredients.archivedAt),
          eq(ingredients.isActive, true),
        ),
      );
    return Number(rows[0]?.value ?? 0);
  },

  async getPreviousApprovedEntries(
    tx: RlsTx,
    args: { venueId: string; excludeCountId?: string },
  ): Promise<{ count: StockCountRow | null; entries: StockCountEntryRow[] }> {
    const counts = await tx
      .select()
      .from(stockCounts)
      .where(
        and(eq(stockCounts.venueId, args.venueId), eq(stockCounts.status, "approved")),
      )
      .orderBy(desc(stockCounts.approvedAt))
      .limit(1);

    const prev = counts[0];
    if (!prev || prev.id === args.excludeCountId) {
      return { count: null, entries: [] };
    }

    const entries = await tx
      .select()
      .from(stockCountEntries)
      .where(eq(stockCountEntries.countId, prev.id));

    return { count: prev, entries };
  },

  async sumReceiptsForIngredient(
    tx: RlsTx,
    args: {
      venueId: string;
      ingredientId: string;
      sinceIso: string;
      untilIso: string;
    },
  ): Promise<number> {
    const rows = await tx
      .select({
        qty: purchaseOrderLines.quantityReceived,
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
          eq(purchaseOrderLines.ingredientId, args.ingredientId),
          gte(purchaseOrderReceivingEvents.receivedAt, args.sinceIso),
          lte(purchaseOrderReceivingEvents.receivedAt, args.untilIso),
        ),
      );

    return rows.reduce((sum, r) => sum + Number(r.qty ?? 0), 0);
  },

  async sumConsumptionForIngredient(
    tx: RlsTx,
    args: {
      venueId: string;
      ingredientId: string;
      fromDate: string;
      toDate: string;
    },
  ): Promise<number> {
    const rows = await tx
      .select({ qty: ingredientConsumptionDaily.qtyConsumedBaseUnits })
      .from(ingredientConsumptionDaily)
      .where(
        and(
          eq(ingredientConsumptionDaily.venueId, args.venueId),
          eq(ingredientConsumptionDaily.ingredientId, args.ingredientId),
          gte(ingredientConsumptionDaily.date, args.fromDate),
          lte(ingredientConsumptionDaily.date, args.toDate),
        ),
      );
    return rows.reduce((sum, r) => sum + Number(r.qty ?? 0), 0);
  },

  async getLargeVarianceThresholdCents(
    tx: RlsTx,
    organisationId: string,
  ): Promise<number> {
    const rows = await tx
      .select({
        threshold: organisationPurchasingSettings.stockCountLargeVarianceCents,
      })
      .from(organisationPurchasingSettings)
      .where(eq(organisationPurchasingSettings.organisationId, organisationId))
      .limit(1);
    return rows[0]?.threshold ?? 50_000;
  },

  async insertAuditEvent(
    tx: RlsTx,
    args: {
      countId: string;
      actorUserId: string | null;
      eventType: string;
      payload?: Record<string, unknown>;
    },
  ): Promise<void> {
    await tx.insert(stockCountAuditEvents).values({
      countId: args.countId,
      actorUserId: args.actorUserId,
      eventType: args.eventType,
      payload: args.payload ?? {},
    });
  },

  async insertVarianceEvents(
    tx: RlsTx,
    rows: Array<typeof stockCountVarianceEvents.$inferInsert>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await tx.insert(stockCountVarianceEvents).values(rows);
  },

  async updateIngredientStockLevel(
    tx: RlsTx,
    args: { ingredientId: string; qty: number },
  ): Promise<void> {
    await tx
      .update(ingredients)
      .set({
        currentStockLevel: String(args.qty),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ingredients.id, args.ingredientId));
  },

  async setRemainingEntriesToZero(
    tx: RlsTx,
    countId: string,
  ): Promise<number> {
    const result = await tx
      .update(stockCountEntries)
      .set({
        countedQty: "0",
        isRowComplete: true,
        isSkipped: false,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(stockCountEntries.countId, countId),
          sql`(${stockCountEntries.isRowComplete} = false OR ${stockCountEntries.countedQty} IS NULL)`,
        ),
      )
      .returning({ id: stockCountEntries.id });
    return result.length;
  },

  async listActiveIngredientsAdmin(
    appDb: AppDb,
    args: {
      organisationId: string;
      venueId: string;
      ingredientIds?: string[];
      categories?: string[];
    },
  ) {
    const conditions: SQL[] = [
      eq(ingredients.organisationId, args.organisationId),
      eq(ingredients.venueId, args.venueId),
      isNull(ingredients.archivedAt),
      eq(ingredients.isActive, true),
    ];
    if (args.ingredientIds?.length) {
      conditions.push(inArray(ingredients.id, args.ingredientIds));
    }
    if (args.categories?.length) {
      conditions.push(inArray(ingredients.category, args.categories));
    }
    return appDb.admin.select().from(ingredients).where(and(...conditions));
  },

  async getPreviousApprovedEntriesAdmin(
    appDb: AppDb,
    args: { venueId: string; excludeCountId?: string },
  ): Promise<{ count: StockCountRow | null; entries: StockCountEntryRow[] }> {
    const counts = await appDb.admin
      .select()
      .from(stockCounts)
      .where(
        and(eq(stockCounts.venueId, args.venueId), eq(stockCounts.status, "approved")),
      )
      .orderBy(desc(stockCounts.approvedAt))
      .limit(1);

    const prev = counts[0];
    if (!prev || prev.id === args.excludeCountId) {
      return { count: null, entries: [] };
    }

    const entries = await appDb.admin
      .select()
      .from(stockCountEntries)
      .where(eq(stockCountEntries.countId, prev.id));

    return { count: prev, entries };
  },

  async insertCountAdmin(
    appDb: AppDb,
    row: typeof stockCounts.$inferInsert,
  ): Promise<StockCountRow> {
    const inserted = await appDb.admin.insert(stockCounts).values(row).returning();
    const created = inserted[0];
    if (!created) throw new Error("Failed to create stock count");
    return created;
  },

  async bulkInsertEntriesAdmin(
    appDb: AppDb,
    rows: Array<typeof stockCountEntries.$inferInsert>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await appDb.admin.insert(stockCountEntries).values(rows);
  },

  async getLastApprovedAtAdmin(
    appDb: AppDb,
    venueId: string,
  ): Promise<string | null> {
    const rows = await appDb.admin
      .select({ approvedAt: stockCounts.approvedAt })
      .from(stockCounts)
      .where(
        and(eq(stockCounts.venueId, venueId), eq(stockCounts.status, "approved")),
      )
      .orderBy(desc(stockCounts.approvedAt))
      .limit(1);
    return rows[0]?.approvedAt ?? null;
  },
};
