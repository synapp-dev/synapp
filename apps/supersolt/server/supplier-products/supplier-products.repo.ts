import {
  and,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import type { AppDb } from "@/server/db/create-app-db";
import {
  ingredients,
  supplierProductPriceHistory,
  supplierProducts,
} from "@/server/db/schema";

export type SupplierProductRow = typeof supplierProducts.$inferSelect;
export type SupplierProductInsert = typeof supplierProducts.$inferInsert;
export type SupplierProductUpdate = Partial<
  Omit<SupplierProductInsert, "id" | "organisationId" | "supplierId">
>;

export type PriceHistorySource =
  | "manual_edit"
  | "invoice"
  | "xero_sync"
  | "bulk_import"
  | "active_switch";

function venueScopeCondition(venueId: string | null): SQL | undefined {
  if (!venueId) return undefined;
  return or(isNull(supplierProducts.venueId), eq(supplierProducts.venueId, venueId))!;
}

export const supplierProductsRepo = {
  async listForSupplier(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      supplierId: string;
      search?: string;
      includeArchived?: boolean;
    },
  ): Promise<SupplierProductRow[]> {
    const conditions: SQL[] = [
      eq(supplierProducts.organisationId, args.organisationId),
      eq(supplierProducts.supplierId, args.supplierId),
    ];

    const venueCond = venueScopeCondition(args.venueId);
    if (venueCond) conditions.push(venueCond);

    if (!args.includeArchived) {
      conditions.push(isNull(supplierProducts.archivedAt));
    }

    if (args.search?.trim()) {
      const pattern = `%${args.search.trim().replace(/[%_]/g, "")}%`;
      conditions.push(
        or(
          ilike(supplierProducts.name, pattern),
          ilike(supplierProducts.skuCode, pattern),
        )!,
      );
    }

    return tx
      .select()
      .from(supplierProducts)
      .where(and(...conditions))
      .orderBy(desc(supplierProducts.updatedAt));
  },

  async listGlobal(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      supplierId?: string;
      ingredientId?: string;
      activeOnly?: boolean;
      page: number;
      pageSize: number;
    },
  ): Promise<{ rows: SupplierProductRow[]; total: number }> {
    const conditions: SQL[] = [
      eq(supplierProducts.organisationId, args.organisationId),
      isNull(supplierProducts.archivedAt),
    ];

    const venueCond = venueScopeCondition(args.venueId);
    if (venueCond) conditions.push(venueCond);

    if (args.supplierId) {
      conditions.push(eq(supplierProducts.supplierId, args.supplierId));
    }
    if (args.ingredientId) {
      conditions.push(eq(supplierProducts.ingredientId, args.ingredientId));
    }
    if (args.activeOnly) {
      conditions.push(eq(supplierProducts.isActiveForIngredient, true));
    }
    if (args.search?.trim()) {
      const pattern = `%${args.search.trim().replace(/[%_]/g, "")}%`;
      conditions.push(
        or(
          ilike(supplierProducts.name, pattern),
          ilike(supplierProducts.skuCode, pattern),
        )!,
      );
    }

    const where = and(...conditions);
    const offset = (args.page - 1) * args.pageSize;

    const [rows, totalRow] = await Promise.all([
      tx
        .select()
        .from(supplierProducts)
        .where(where)
        .orderBy(desc(supplierProducts.updatedAt))
        .limit(args.pageSize)
        .offset(offset),
      tx.select({ value: count() }).from(supplierProducts).where(where),
    ]);

    return { rows, total: Number(totalRow[0]?.value ?? 0) };
  },

  async getById(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      productId: string;
    },
  ): Promise<SupplierProductRow | null> {
    const conditions: SQL[] = [
      eq(supplierProducts.id, args.productId),
      eq(supplierProducts.organisationId, args.organisationId),
      isNull(supplierProducts.archivedAt),
    ];
    const venueCond = venueScopeCondition(args.venueId);
    if (venueCond) conditions.push(venueCond);

    const rows = await tx
      .select()
      .from(supplierProducts)
      .where(and(...conditions))
      .limit(1);

    return rows[0] ?? null;
  },

  async countBySupplierIds(
    tx: RlsTx,
    args: { organisationId: string; supplierIds: string[] },
  ): Promise<Map<string, number>> {
    if (args.supplierIds.length === 0) return new Map();

    const rows = await tx
      .select({
        supplierId: supplierProducts.supplierId,
        value: count(),
      })
      .from(supplierProducts)
      .where(
        and(
          eq(supplierProducts.organisationId, args.organisationId),
          inArray(supplierProducts.supplierId, args.supplierIds),
          isNull(supplierProducts.archivedAt),
        ),
      )
      .groupBy(supplierProducts.supplierId);

    return new Map(rows.map((r) => [r.supplierId, Number(r.value)]));
  },

  async createProduct(
    tx: RlsTx,
    row: SupplierProductInsert,
  ): Promise<SupplierProductRow> {
    const inserted = await tx.insert(supplierProducts).values(row).returning();
    const created = inserted[0];
    if (!created) throw new Error("Failed to create supplier product");
    return created;
  },

  async updateProduct(
    tx: RlsTx,
    args: {
      organisationId: string;
      productId: string;
      row: SupplierProductUpdate;
    },
  ): Promise<SupplierProductRow | null> {
    const updated = await tx
      .update(supplierProducts)
      .set({ ...args.row, updatedAt: new Date().toISOString() })
      .where(
        and(
          eq(supplierProducts.id, args.productId),
          eq(supplierProducts.organisationId, args.organisationId),
          isNull(supplierProducts.archivedAt),
        ),
      )
      .returning();

    return updated[0] ?? null;
  },

  async archiveProduct(
    tx: RlsTx,
    args: { organisationId: string; productId: string },
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updated = await tx
      .update(supplierProducts)
      .set({
        archivedAt: now,
        updatedAt: now,
        isActiveForIngredient: false,
      })
      .where(
        and(
          eq(supplierProducts.id, args.productId),
          eq(supplierProducts.organisationId, args.organisationId),
          isNull(supplierProducts.archivedAt),
        ),
      )
      .returning({ id: supplierProducts.id });

    return updated.length > 0;
  },

  async archiveBySupplierId(
    tx: RlsTx,
    args: { organisationId: string; supplierId: string },
  ): Promise<void> {
    const now = new Date().toISOString();
    await tx
      .update(supplierProducts)
      .set({
        archivedAt: now,
        updatedAt: now,
        isActiveForIngredient: false,
      })
      .where(
        and(
          eq(supplierProducts.supplierId, args.supplierId),
          eq(supplierProducts.organisationId, args.organisationId),
          isNull(supplierProducts.archivedAt),
        ),
      );
  },

  async clearActiveForIngredient(
    tx: RlsTx,
    args: { organisationId: string; ingredientId: string; excludeProductId?: string },
  ): Promise<void> {
    const conditions: SQL[] = [
      eq(supplierProducts.organisationId, args.organisationId),
      eq(supplierProducts.ingredientId, args.ingredientId),
      eq(supplierProducts.isActiveForIngredient, true),
      isNull(supplierProducts.archivedAt),
    ];
    if (args.excludeProductId) {
      conditions.push(sql`${supplierProducts.id} <> ${args.excludeProductId}`);
    }

    await tx
      .update(supplierProducts)
      .set({ isActiveForIngredient: false, updatedAt: new Date().toISOString() })
      .where(and(...conditions));
  },

  async setActiveForIngredient(
    tx: RlsTx,
    args: {
      organisationId: string;
      productId: string;
      ingredientId: string;
    },
  ): Promise<void> {
    await supplierProductsRepo.clearActiveForIngredient(tx, {
      organisationId: args.organisationId,
      ingredientId: args.ingredientId,
      excludeProductId: args.productId,
    });

    await tx
      .update(supplierProducts)
      .set({
        isActiveForIngredient: true,
        ingredientId: args.ingredientId,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(supplierProducts.id, args.productId),
          eq(supplierProducts.organisationId, args.organisationId),
        ),
      );

    await tx
      .update(ingredients)
      .set({
        activeSupplierProductId: args.productId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(ingredients.id, args.ingredientId));
  },

  async insertPriceHistory(
    tx: RlsTx,
    row: typeof supplierProductPriceHistory.$inferInsert,
  ): Promise<void> {
    await tx.insert(supplierProductPriceHistory).values(row);
  },

  async listPriceHistory(
    tx: RlsTx,
    args: { organisationId: string; productId: string; limit?: number },
  ) {
    return tx
      .select()
      .from(supplierProductPriceHistory)
      .where(
        and(
          eq(supplierProductPriceHistory.organisationId, args.organisationId),
          eq(supplierProductPriceHistory.supplierProductId, args.productId),
        ),
      )
      .orderBy(desc(supplierProductPriceHistory.changedAt))
      .limit(args.limit ?? 50);
  },

  /** Used by invoice ingestion (admin connection). */
  async listActiveForVenue(
    appDb: AppDb,
    args: { organisationId: string; venueId: string; supplierId?: string },
  ) {
    const conditions = [
      eq(supplierProducts.organisationId, args.organisationId),
      isNull(supplierProducts.archivedAt),
    ];
    if (args.supplierId) {
      conditions.push(eq(supplierProducts.supplierId, args.supplierId));
    }

    return appDb.admin
      .select()
      .from(supplierProducts)
      .where(and(...conditions));
  },

  async updateUnitPrice(
    appDb: AppDb,
    args: { id: string; unitPriceCents: number; updatedBy?: string },
  ): Promise<void> {
    await appDb.admin
      .update(supplierProducts)
      .set({
        unitPriceCents: args.unitPriceCents,
        updatedAt: new Date().toISOString(),
        updatedBy: args.updatedBy ?? null,
      })
      .where(eq(supplierProducts.id, args.id));
  },

  async createProductAdmin(
    appDb: AppDb,
    row: SupplierProductInsert,
  ) {
    const rows = await appDb.admin.insert(supplierProducts).values(row).returning();
    return rows[0]!;
  },
};
