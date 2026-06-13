import {
  and,
  count,
  desc,
  eq,
  ilike,
  isNull,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import { ingredients } from "@/server/db/schema";

export type IngredientRow = typeof ingredients.$inferSelect;
export type IngredientInsert = typeof ingredients.$inferInsert;
export type IngredientUpdate = Partial<
  Omit<IngredientInsert, "id" | "organisationId" | "venueId">
>;

export const ingredientsRepo = {
  async listIngredients(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      supplierId?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ rows: IngredientRow[]; total: number }> {
    const conditions: SQL[] = [
      eq(ingredients.organisationId, args.organisationId),
      eq(ingredients.venueId, args.venueId),
      isNull(ingredients.archivedAt),
    ];

    if (args.search) {
      conditions.push(ilike(ingredients.name, `%${args.search}%`));
    }
    if (args.category) {
      conditions.push(eq(ingredients.category, args.category));
    }
    if (args.status) {
      conditions.push(eq(ingredients.status, args.status));
    }
    if (args.supplierId) {
      conditions.push(eq(ingredients.supplierId, args.supplierId));
    }

    const where = and(...conditions);
    const offset = (args.page - 1) * args.pageSize;

    const [rows, totalRow] = await Promise.all([
      tx
        .select()
        .from(ingredients)
        .where(where)
        .orderBy(desc(ingredients.updatedAt))
        .limit(args.pageSize)
        .offset(offset),
      tx.select({ value: count() }).from(ingredients).where(where),
    ]);

    return {
      rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  },

  async getIngredientById(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; ingredientId: string },
  ): Promise<IngredientRow | null> {
    const rows = await tx
      .select()
      .from(ingredients)
      .where(
        and(
          eq(ingredients.id, args.ingredientId),
          eq(ingredients.organisationId, args.organisationId),
          eq(ingredients.venueId, args.venueId),
          isNull(ingredients.archivedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async createIngredient(
    tx: RlsTx,
    row: IngredientInsert,
  ): Promise<IngredientRow> {
    const inserted = await tx.insert(ingredients).values(row).returning();
    const created = inserted[0];
    if (!created) {
      throw new Error("Failed to create ingredient");
    }
    return created;
  },

  async updateIngredient(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      ingredientId: string;
      row: IngredientUpdate;
    },
  ): Promise<IngredientRow | null> {
    const updated = await tx
      .update(ingredients)
      .set(args.row)
      .where(
        and(
          eq(ingredients.id, args.ingredientId),
          eq(ingredients.organisationId, args.organisationId),
          eq(ingredients.venueId, args.venueId),
          isNull(ingredients.archivedAt),
        ),
      )
      .returning();

    return updated[0] ?? null;
  },

  async softDeleteIngredient(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; ingredientId: string },
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updated = await tx
      .update(ingredients)
      .set({
        status: "inactive",
        isActive: false,
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(ingredients.id, args.ingredientId),
          eq(ingredients.organisationId, args.organisationId),
          eq(ingredients.venueId, args.venueId),
          isNull(ingredients.archivedAt),
        ),
      )
      .returning({ id: ingredients.id });

    return updated.length > 0;
  },
};
