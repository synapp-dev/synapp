import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import {
  recipesRepo,
  type RecipeIngredientInput,
  type RecipeRow,
} from "./recipes.repo";

const RECIPE_CATEGORIES = [
  "mains",
  "sides",
  "drinks",
  "desserts",
  "prep",
  "other",
] as const;
const RECIPE_STATUSES = ["draft", "published", "archived"] as const;

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export type RecipeSummary = {
  id: string;
  name: string;
  category: RecipeCategory;
  serves: number;
  costPerServe: number;
  suggestedPrice: number;
  gpPercent: number;
  status: RecipeStatus;
  updatedAt: string;
};

export type RecipeDetail = RecipeSummary & {
  description: string;
  wastagePercent: number;
  instructions: string;
  ingredients: Array<{
    id: string;
    ingredientId: string | null;
    name: string;
    quantity: number;
    unit: string;
    unitCostCents: number;
    isSubRecipe: boolean;
  }>;
  steps: string[];
  allergens: string[];
};

export type UpsertRecipeInput = {
  name: string;
  description?: string | null;
  category: string;
  serves: number;
  wastagePercent: number;
  gpTargetPercent: number;
  costPerServe: number;
  suggestedPrice: number;
  status: string;
  instructions: string;
  ingredients: RecipeIngredientInput[];
  steps: string[];
  allergens: string[];
};

export class RecipesServiceError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new RecipesServiceError(error.status, error.message);
  }
  throw error;
}

function assertRecipeCategory(value: string): RecipeCategory {
  if (!RECIPE_CATEGORIES.includes(value as RecipeCategory)) {
    throw new RecipesServiceError(400, "Invalid item category");
  }
  return value as RecipeCategory;
}

function assertRecipeStatus(value: string): RecipeStatus {
  if (!RECIPE_STATUSES.includes(value as RecipeStatus)) {
    throw new RecipesServiceError(400, "Invalid item status");
  }
  return value as RecipeStatus;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toSummary(row: RecipeRow): RecipeSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category as RecipeCategory,
    serves: row.serves,
    costPerServe: row.costPerServeCents,
    suggestedPrice: row.suggestedPriceCents,
    gpPercent: Number(row.gpTargetPercent),
    status: row.status as RecipeStatus,
    updatedAt: row.updatedAt,
  };
}

async function resolveScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new RecipesServiceError(404, message),
    forbidden: (auth) => new RecipesServiceError(auth.status, auth.message),
  });
}

function normalizeUpsertInput(input: UpsertRecipeInput) {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new RecipesServiceError(400, "Item name is required");
  }

  return {
    name,
    description: input.description?.trim() ?? null,
    category: assertRecipeCategory(input.category),
    status: assertRecipeStatus(input.status),
    serves: Math.max(1, Math.floor(input.serves || 1)),
    wastePercent: clampNumber(Number(input.wastagePercent || 0), 0, 100),
    gpTargetPercent: clampNumber(Number(input.gpTargetPercent || 65), 1, 95),
    costPerServe: Math.max(0, Math.round(Number(input.costPerServe || 0))),
    suggestedPrice: Math.max(0, Math.round(Number(input.suggestedPrice || 0))),
    method: input.instructions?.trim() ?? "",
    ingredients: (input.ingredients ?? [])
      .map((ingredient) => ({
        ingredientId: ingredient.ingredientId ?? null,
        name: ingredient.name.trim(),
        quantity: Math.max(0, Number(ingredient.quantity || 0)),
        unit: ingredient.unit.trim(),
        unitCostCents: Math.max(
          0,
          Math.round(Number(ingredient.unitCostCents || 0)),
        ),
        isSubRecipe: Boolean(ingredient.isSubRecipe),
      }))
      .filter((ingredient) => ingredient.name.length > 0),
    steps: (input.steps ?? []).map((step) => step.trim()).filter(Boolean),
    allergens: (input.allergens ?? [])
      .map((allergen) => allergen.trim())
      .filter(Boolean),
  };
}

export const recipesService = {
  async list(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{ recipes: RecipeSummary[]; total: number }> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    const category = args.category
      ? assertRecipeCategory(args.category)
      : undefined;
    const status = args.status ? assertRecipeStatus(args.status) : undefined;

    const result = await ctx.appDb.rls((tx) =>
      recipesRepo.listRecipes(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        search: args.search?.trim() || undefined,
        category,
        status,
        page,
        pageSize,
      }),
    );

    return {
      recipes: result.rows.map(toSummary),
      total: result.total,
    };
  },

  async getById(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
    },
  ): Promise<RecipeDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    const recipe = await ctx.appDb.rls((tx) =>
      recipesRepo.getRecipeById(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        recipeId: args.recipeId,
      }),
    );
    if (!recipe) {
      return null;
    }

    const [ingredients, steps, allergens] = await ctx.appDb.rls((tx) =>
      Promise.all([
        recipesRepo.listIngredients(tx, recipe.id),
        recipesRepo.listMethodSteps(tx, recipe.id),
        recipesRepo.listAllergens(tx, recipe.id),
      ]),
    );

    return {
      ...toSummary(recipe),
      description: recipe.description ?? "",
      wastagePercent: Number(recipe.wastePercent),
      instructions: recipe.method ?? "",
      ingredients: ingredients.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        name: item.ingredientName,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitCostCents: item.unitCostCents,
        isSubRecipe: item.isSubRecipe,
      })),
      steps: steps.map((step) => step.instruction),
      allergens: allergens.map((allergen) => allergen.allergenCode),
    };
  },

  async create(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      input: UpsertRecipeInput;
    },
  ): Promise<RecipeDetail> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const payload = normalizeUpsertInput(args.input);

    const created = await ctx.appDb.rls(async (tx) => {
      const row = await recipesRepo.createRecipe(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        name: payload.name,
        description: payload.description,
        category: payload.category,
        status: payload.status,
        serves: payload.serves,
        wastePercent: payload.wastePercent,
        gpTargetPercent: payload.gpTargetPercent,
        costPerServeCents: payload.costPerServe,
        suggestedPriceCents: payload.suggestedPrice,
        method: payload.method,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
        updatedAt: new Date().toISOString(),
      });

      await Promise.all([
        recipesRepo.replaceIngredients(tx, row.id, payload.ingredients),
        recipesRepo.replaceMethodSteps(tx, row.id, payload.steps),
        recipesRepo.replaceAllergens(tx, row.id, payload.allergens),
      ]);

      return row;
    });

    const detail = await this.getById(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      recipeId: created.id,
    });

    if (!detail) {
      throw new RecipesServiceError(500, "Created item not found");
    }

    return detail;
  },

  async update(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
      input: UpsertRecipeInput;
    },
  ): Promise<RecipeDetail | null> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );
    const payload = normalizeUpsertInput(args.input);

    const updated = await ctx.appDb.rls(async (tx) => {
      const row = await recipesRepo.updateRecipe(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        recipeId: args.recipeId,
        row: {
          name: payload.name,
          description: payload.description,
          category: payload.category,
          status: payload.status,
          serves: payload.serves,
          wastePercent: payload.wastePercent,
          gpTargetPercent: payload.gpTargetPercent,
          costPerServeCents: payload.costPerServe,
          suggestedPriceCents: payload.suggestedPrice,
          method: payload.method,
          updatedBy: ctx.userId,
          updatedAt: new Date().toISOString(),
        },
      });

      if (!row) {
        return null;
      }

      await Promise.all([
        recipesRepo.replaceIngredients(tx, row.id, payload.ingredients),
        recipesRepo.replaceMethodSteps(tx, row.id, payload.steps),
        recipesRepo.replaceAllergens(tx, row.id, payload.allergens),
      ]);

      return row;
    });

    if (!updated) {
      return null;
    }

    return this.getById(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      recipeId: updated.id,
    });
  },

  async delete(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
    },
  ): Promise<boolean> {
    const scope = await resolveScope(
      ctx,
      args.organisationSlug,
      args.venueSlug,
    );

    return ctx.appDb.rls((tx) =>
      recipesRepo.softDeleteRecipe(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        recipeId: args.recipeId,
      }),
    );
  },
};
