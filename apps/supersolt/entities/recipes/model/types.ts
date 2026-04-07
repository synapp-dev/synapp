export type RecipeCategory =
  | "mains"
  | "sides"
  | "drinks"
  | "desserts"
  | "prep"
  | "other";

export type RecipeStatus = "draft" | "published" | "archived";

export type RecipeIngredient = {
  id: string;
  ingredientId?: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  isSubRecipe: boolean;
};

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
  ingredients: RecipeIngredient[];
  steps: string[];
  allergens: string[];
};

export type RecipeListResponse = {
  recipes: RecipeSummary[];
  total: number;
};

export type UpsertRecipeInput = {
  name: string;
  description?: string | null;
  category: RecipeCategory;
  serves: number;
  wastagePercent: number;
  gpTargetPercent: number;
  costPerServe: number;
  suggestedPrice: number;
  status: RecipeStatus;
  instructions: string;
  ingredients: Array<{
    ingredientId?: string | null;
    name: string;
    quantity: number;
    unit: string;
    unitCostCents: number;
    isSubRecipe: boolean;
  }>;
  steps: string[];
  allergens: string[];
};
