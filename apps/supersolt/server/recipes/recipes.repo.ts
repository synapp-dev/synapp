import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/types";

type Supabase = SupabaseClient<Database>;

export type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
export type RecipeIngredientRow =
  Database["public"]["Tables"]["recipe_ingredients"]["Row"];
export type RecipeMethodStepRow =
  Database["public"]["Tables"]["recipe_method_steps"]["Row"];
export type RecipeAllergenRow =
  Database["public"]["Tables"]["recipe_allergens"]["Row"];

export type RecipeIngredientInput = {
  ingredientId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  isSubRecipe: boolean;
};

export const recipesRepo = {
  async getVenueContextBySlugs(
    supabase: Supabase,
    organisationSlug: string,
    venueSlug: string
  ): Promise<{ organisationId: string; venueId: string } | null> {
    const { data, error } = await supabase
      .from("venues")
      .select("id, organisation_id, organisations:organisation_id (slug)")
      .eq("slug", venueSlug)
      .eq("is_active", true)
      .is("archived_at", null)
      .eq("organisations.slug", organisationSlug)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const venueRow = data as { id: string; organisation_id: string };

    return {
      organisationId: venueRow.organisation_id,
      venueId: venueRow.id,
    };
  },

  async listRecipes(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      search?: string;
      category?: string;
      status?: string;
      page: number;
      pageSize: number;
    }
  ): Promise<{ rows: RecipeRow[]; total: number }> {
    const from = (args.page - 1) * args.pageSize;
    const to = from + args.pageSize - 1;
    let query = supabase
      .from("recipes")
      .select("*", { count: "exact" })
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null);

    if (args.search) {
      query = query.ilike("name", `%${args.search}%`);
    }
    if (args.category) {
      query = query.eq("category", args.category);
    }
    if (args.status) {
      query = query.eq("status", args.status);
    }

    const { data, error, count } = await query
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      rows: (data ?? []) as RecipeRow[],
      total: count ?? 0,
    };
  },

  async getRecipeById(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; recipeId: string }
  ): Promise<RecipeRow | null> {
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", args.recipeId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return (data as RecipeRow | null) ?? null;
  },

  async createRecipe(
    supabase: Supabase,
    row: Database["public"]["Tables"]["recipes"]["Insert"]
  ): Promise<RecipeRow> {
    const { data, error } = await supabase
      .from("recipes")
      .insert(row)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return data as RecipeRow;
  },

  async updateRecipe(
    supabase: Supabase,
    args: {
      organisationId: string;
      venueId: string;
      recipeId: string;
      row: Database["public"]["Tables"]["recipes"]["Update"];
    }
  ): Promise<RecipeRow | null> {
    const { data, error } = await supabase
      .from("recipes")
      .update(args.row)
      .eq("id", args.recipeId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    return (data as RecipeRow | null) ?? null;
  },

  async softDeleteRecipe(
    supabase: Supabase,
    args: { organisationId: string; venueId: string; recipeId: string }
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("recipes")
      .update({
        status: "archived",
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.recipeId)
      .eq("organisation_id", args.organisationId)
      .eq("venue_id", args.venueId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data?.id);
  },

  async listIngredients(
    supabase: Supabase,
    recipeId: string
  ): Promise<RecipeIngredientRow[]> {
    const { data, error } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as RecipeIngredientRow[];
  },

  async listMethodSteps(
    supabase: Supabase,
    recipeId: string
  ): Promise<RecipeMethodStepRow[]> {
    const { data, error } = await supabase
      .from("recipe_method_steps")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("step_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as RecipeMethodStepRow[];
  },

  async listAllergens(
    supabase: Supabase,
    recipeId: string
  ): Promise<RecipeAllergenRow[]> {
    const { data, error } = await supabase
      .from("recipe_allergens")
      .select("*")
      .eq("recipe_id", recipeId)
      .order("allergen_code", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []) as RecipeAllergenRow[];
  },

  async replaceIngredients(
    supabase: Supabase,
    recipeId: string,
    ingredients: RecipeIngredientInput[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("recipe_ingredients")
      .delete()
      .eq("recipe_id", recipeId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    if (ingredients.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from("recipe_ingredients")
      .insert(
        ingredients.map((item, index) => ({
          recipe_id: recipeId,
          ingredient_id: item.ingredientId ?? null,
          ingredient_name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost_cents: item.unitCostCents,
          is_sub_recipe: item.isSubRecipe,
          sort_order: index + 1,
        }))
      );

    if (insertError) {
      throw new Error(insertError.message);
    }
  },

  async replaceMethodSteps(
    supabase: Supabase,
    recipeId: string,
    steps: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("recipe_method_steps")
      .delete()
      .eq("recipe_id", recipeId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const normalized = steps
      .map((step) => step.trim())
      .filter((step) => step.length > 0);
    if (normalized.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from("recipe_method_steps")
      .insert(
        normalized.map((instruction, index) => ({
          recipe_id: recipeId,
          step_order: index + 1,
          instruction,
        }))
      );
    if (insertError) {
      throw new Error(insertError.message);
    }
  },

  async replaceAllergens(
    supabase: Supabase,
    recipeId: string,
    allergens: string[]
  ): Promise<void> {
    const { error: deleteError } = await supabase
      .from("recipe_allergens")
      .delete()
      .eq("recipe_id", recipeId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    const normalized = Array.from(
      new Set(
        allergens
          .map((allergen) => allergen.trim())
          .filter((allergen) => allergen.length > 0)
      )
    );
    if (normalized.length === 0) {
      return;
    }

    const { error: insertError } = await supabase
      .from("recipe_allergens")
      .insert(
        normalized.map((allergenCode) => ({
          recipe_id: recipeId,
          allergen_code: allergenCode,
        }))
      );

    if (insertError) {
      throw new Error(insertError.message);
    }
  },
};
