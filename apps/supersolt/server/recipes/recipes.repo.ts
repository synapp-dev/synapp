import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNull,
  type SQL,
} from "drizzle-orm";

import type { RlsTx } from "@/server/db/drizzle";
import {
  recipeAllergens,
  recipeIngredients,
  recipeMethodSteps,
  recipes,
} from "@/server/db/schema";

export type RecipeRow = typeof recipes.$inferSelect;
export type RecipeInsert = typeof recipes.$inferInsert;
export type RecipeUpdate = Partial<
  Omit<RecipeInsert, "id" | "organisationId" | "venueId">
>;
export type RecipeIngredientRow = typeof recipeIngredients.$inferSelect;
export type RecipeMethodStepRow = typeof recipeMethodSteps.$inferSelect;
export type RecipeAllergenRow = typeof recipeAllergens.$inferSelect;

export type RecipeIngredientInput = {
  ingredientId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  isSubRecipe: boolean;
};

export const recipesRepo = {
  async listRecipes(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      page: number;
      pageSize: number;
    },
  ): Promise<{ rows: RecipeRow[]; total: number }> {
    const conditions: SQL[] = [
      eq(recipes.organisationId, args.organisationId),
      eq(recipes.venueId, args.venueId),
      isNull(recipes.archivedAt),
    ];

    if (args.search) {
      conditions.push(ilike(recipes.name, `%${args.search}%`));
    }
    if (args.category) {
      conditions.push(eq(recipes.category, args.category));
    }
    if (args.status) {
      conditions.push(eq(recipes.status, args.status));
    }

    const where = and(...conditions);
    const offset = (args.page - 1) * args.pageSize;

    const [rows, totalRow] = await Promise.all([
      tx
        .select()
        .from(recipes)
        .where(where)
        .orderBy(desc(recipes.updatedAt))
        .limit(args.pageSize)
        .offset(offset),
      tx.select({ value: count() }).from(recipes).where(where),
    ]);

    return {
      rows,
      total: Number(totalRow[0]?.value ?? 0),
    };
  },

  async getRecipeById(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; recipeId: string },
  ): Promise<RecipeRow | null> {
    const rows = await tx
      .select()
      .from(recipes)
      .where(
        and(
          eq(recipes.id, args.recipeId),
          eq(recipes.organisationId, args.organisationId),
          eq(recipes.venueId, args.venueId),
          isNull(recipes.archivedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  },

  async createRecipe(tx: RlsTx, row: RecipeInsert): Promise<RecipeRow> {
    const inserted = await tx.insert(recipes).values(row).returning();
    const created = inserted[0];
    if (!created) {
      throw new Error("Failed to create recipe");
    }
    return created;
  },

  async updateRecipe(
    tx: RlsTx,
    args: {
      organisationId: string;
      venueId: string;
      recipeId: string;
      row: RecipeUpdate;
    },
  ): Promise<RecipeRow | null> {
    const updated = await tx
      .update(recipes)
      .set(args.row)
      .where(
        and(
          eq(recipes.id, args.recipeId),
          eq(recipes.organisationId, args.organisationId),
          eq(recipes.venueId, args.venueId),
          isNull(recipes.archivedAt),
        ),
      )
      .returning();

    return updated[0] ?? null;
  },

  async softDeleteRecipe(
    tx: RlsTx,
    args: { organisationId: string; venueId: string; recipeId: string },
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const updated = await tx
      .update(recipes)
      .set({
        status: "archived",
        isActive: false,
        archivedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(recipes.id, args.recipeId),
          eq(recipes.organisationId, args.organisationId),
          eq(recipes.venueId, args.venueId),
          isNull(recipes.archivedAt),
        ),
      )
      .returning({ id: recipes.id });

    return updated.length > 0;
  },

  async listIngredients(
    tx: RlsTx,
    recipeId: string,
  ): Promise<RecipeIngredientRow[]> {
    return tx
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId))
      .orderBy(asc(recipeIngredients.sortOrder));
  },

  async listMethodSteps(
    tx: RlsTx,
    recipeId: string,
  ): Promise<RecipeMethodStepRow[]> {
    return tx
      .select()
      .from(recipeMethodSteps)
      .where(eq(recipeMethodSteps.recipeId, recipeId))
      .orderBy(asc(recipeMethodSteps.stepOrder));
  },

  async listAllergens(
    tx: RlsTx,
    recipeId: string,
  ): Promise<RecipeAllergenRow[]> {
    return tx
      .select()
      .from(recipeAllergens)
      .where(eq(recipeAllergens.recipeId, recipeId))
      .orderBy(asc(recipeAllergens.allergenCode));
  },

  async replaceIngredients(
    tx: RlsTx,
    recipeId: string,
    ingredients: RecipeIngredientInput[],
  ): Promise<void> {
    await tx
      .delete(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, recipeId));

    if (ingredients.length === 0) {
      return;
    }

    await tx.insert(recipeIngredients).values(
      ingredients.map((item, index) => ({
        recipeId,
        ingredientId: item.ingredientId ?? null,
        ingredientName: item.name,
        quantity: String(item.quantity),
        unit: item.unit,
        unitCostCents: item.unitCostCents,
        isSubRecipe: item.isSubRecipe,
        sortOrder: index + 1,
      })),
    );
  },

  async replaceMethodSteps(
    tx: RlsTx,
    recipeId: string,
    steps: string[],
  ): Promise<void> {
    await tx
      .delete(recipeMethodSteps)
      .where(eq(recipeMethodSteps.recipeId, recipeId));

    const normalized = steps
      .map((step) => step.trim())
      .filter((step) => step.length > 0);
    if (normalized.length === 0) {
      return;
    }

    await tx.insert(recipeMethodSteps).values(
      normalized.map((instruction, index) => ({
        recipeId,
        stepOrder: index + 1,
        instruction,
      })),
    );
  },

  async replaceAllergens(
    tx: RlsTx,
    recipeId: string,
    allergens: string[],
  ): Promise<void> {
    await tx
      .delete(recipeAllergens)
      .where(eq(recipeAllergens.recipeId, recipeId));

    const normalized = Array.from(
      new Set(
        allergens
          .map((allergen) => allergen.trim())
          .filter((allergen) => allergen.length > 0),
      ),
    );
    if (normalized.length === 0) {
      return;
    }

    await tx.insert(recipeAllergens).values(
      normalized.map((allergenCode) => ({
        recipeId,
        allergenCode,
      })),
    );
  },
};
