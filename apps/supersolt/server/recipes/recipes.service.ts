import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";
import { recipesRepo, type RecipeIngredientInput } from "./recipes.repo";

type Supabase = SupabaseClient<Database>;

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

function toSummary(
  row: Database["public"]["Tables"]["recipes"]["Row"]
): RecipeSummary {
  return {
    id: row.id,
    name: row.name,
    category: row.category as RecipeCategory,
    serves: row.serves,
    costPerServe: row.cost_per_serve_cents,
    suggestedPrice: row.suggested_price_cents,
    gpPercent: Number(row.gp_target_percent),
    status: row.status as RecipeStatus,
    updatedAt: row.updated_at,
  };
}

async function assertVenueAccess(
  supabase: Supabase,
  args: {
    userId: string;
    organisationId: string;
    venueId: string;
  }
): Promise<void> {
  const { data, error } = await supabase
    .from("user_organisations")
    .select("id")
    .eq("user_profile_id", args.userId)
    .eq("organisation_id", args.organisationId)
    .eq("is_active", true)
    .is("archived_at", null);

  if (error) {
    throw new RecipesServiceError(500, error.message);
  }

  const membershipIds = (data ?? []).map((item) => item.id);
  if (membershipIds.length === 0) {
    throw new RecipesServiceError(403, "Forbidden");
  }

  const { data: venueAccess, error: venueError } = await supabase
    .from("user_venues")
    .select("id")
    .in("user_organisation_id", membershipIds)
    .eq("venue_id", args.venueId)
    .eq("is_active", true)
    .is("archived_at", null)
    .limit(1);

  if (venueError) {
    throw new RecipesServiceError(500, venueError.message);
  }

  if (!venueAccess || venueAccess.length === 0) {
    throw new RecipesServiceError(403, "Forbidden");
  }
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
        unitCostCents: Math.max(0, Math.round(Number(ingredient.unitCostCents || 0))),
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
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      search?: string;
      category?: string;
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ recipes: RecipeSummary[]; total: number }> {
    const context = await recipesRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new RecipesServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = clampNumber(Number(args.pageSize ?? 20), 1, 200);
    const category = args.category ? assertRecipeCategory(args.category) : undefined;
    const status = args.status ? assertRecipeStatus(args.status) : undefined;

    const result = await recipesRepo.listRecipes(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      search: args.search?.trim() || undefined,
      category,
      status,
      page,
      pageSize,
    });

    return {
      recipes: result.rows.map(toSummary),
      total: result.total,
    };
  },

  async getById(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
    }
  ): Promise<RecipeDetail | null> {
    const context = await recipesRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new RecipesServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const recipe = await recipesRepo.getRecipeById(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      recipeId: args.recipeId,
    });
    if (!recipe) {
      return null;
    }

    const [ingredients, steps, allergens] = await Promise.all([
      recipesRepo.listIngredients(supabase, recipe.id),
      recipesRepo.listMethodSteps(supabase, recipe.id),
      recipesRepo.listAllergens(supabase, recipe.id),
    ]);

    return {
      ...toSummary(recipe),
      description: recipe.description ?? "",
      wastagePercent: Number(recipe.waste_percent),
      instructions: recipe.method ?? "",
      ingredients: ingredients.map((item) => ({
        id: item.id,
        ingredientId: item.ingredient_id,
        name: item.ingredient_name,
        quantity: Number(item.quantity),
        unit: item.unit,
        unitCostCents: item.unit_cost_cents,
        isSubRecipe: item.is_sub_recipe,
      })),
      steps: steps.map((step) => step.instruction),
      allergens: allergens.map((allergen) => allergen.allergen_code),
    };
  },

  async create(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      input: UpsertRecipeInput;
    }
  ): Promise<RecipeDetail> {
    const context = await recipesRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new RecipesServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeUpsertInput(args.input);
    const created = await recipesRepo.createRecipe(supabase, {
      organisation_id: context.organisationId,
      venue_id: context.venueId,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      status: payload.status,
      serves: payload.serves,
      waste_percent: payload.wastePercent,
      gp_target_percent: payload.gpTargetPercent,
      cost_per_serve_cents: payload.costPerServe,
      suggested_price_cents: payload.suggestedPrice,
      method: payload.method,
      created_by: args.userId,
      updated_by: args.userId,
      updated_at: new Date().toISOString(),
    });

    await Promise.all([
      recipesRepo.replaceIngredients(supabase, created.id, payload.ingredients),
      recipesRepo.replaceMethodSteps(supabase, created.id, payload.steps),
      recipesRepo.replaceAllergens(supabase, created.id, payload.allergens),
    ]);

    const detail = await this.getById(supabase, {
      userId: args.userId,
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
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
      input: UpsertRecipeInput;
    }
  ): Promise<RecipeDetail | null> {
    const context = await recipesRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new RecipesServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const payload = normalizeUpsertInput(args.input);
    const updated = await recipesRepo.updateRecipe(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      recipeId: args.recipeId,
      row: {
        name: payload.name,
        description: payload.description,
        category: payload.category,
        status: payload.status,
        serves: payload.serves,
        waste_percent: payload.wastePercent,
        gp_target_percent: payload.gpTargetPercent,
        cost_per_serve_cents: payload.costPerServe,
        suggested_price_cents: payload.suggestedPrice,
        method: payload.method,
        updated_by: args.userId,
        updated_at: new Date().toISOString(),
      },
    });

    if (!updated) {
      return null;
    }

    await Promise.all([
      recipesRepo.replaceIngredients(supabase, updated.id, payload.ingredients),
      recipesRepo.replaceMethodSteps(supabase, updated.id, payload.steps),
      recipesRepo.replaceAllergens(supabase, updated.id, payload.allergens),
    ]);

    return this.getById(supabase, {
      userId: args.userId,
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
      recipeId: updated.id,
    });
  },

  async delete(
    supabase: Supabase,
    args: {
      userId: string;
      organisationSlug: string;
      venueSlug: string;
      recipeId: string;
    }
  ): Promise<boolean> {
    const context = await recipesRepo.getVenueContextBySlugs(
      supabase,
      args.organisationSlug,
      args.venueSlug
    );
    if (!context) {
      throw new RecipesServiceError(404, "Venue not found");
    }

    await assertVenueAccess(supabase, {
      userId: args.userId,
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    return recipesRepo.softDeleteRecipe(supabase, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      recipeId: args.recipeId,
    });
  },
};
