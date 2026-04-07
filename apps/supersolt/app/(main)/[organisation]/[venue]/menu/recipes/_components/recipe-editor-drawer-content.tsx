"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { useIngredientMutations } from "@/entities/ingredients/model/useIngredientMutations";
import { useIngredientSelectorQuery } from "@/entities/ingredients/model/useIngredientsQuery";
import type { UpsertIngredientInput } from "@/entities/ingredients/model/types";
import { IngredientEditorDialog } from "@/entities/ingredients/ui/ingredient-editor-dialog";
import type {
  RecipeCategory,
  RecipeDetail,
  RecipeSummary,
  UpsertRecipeInput,
} from "@/entities/recipes/model/types";

export type RecipeEditorRecipe = RecipeSummary;

export const RECIPE_EDITOR_TABS = ["details", "ingredients", "method", "allergens"] as const;
export type RecipeEditorTab = (typeof RECIPE_EDITOR_TABS)[number];

type RecipeIngredient = {
  id: string;
  ingredientId: string | null;
  name: string;
  quantity: number;
  unit: string;
  unitCostCents: number;
  isSubRecipe: boolean;
};

type RecipeEditorDrawerContentProps = {
  organisation: string;
  venue: string;
  recipe: RecipeDetail | null;
  activeTab: RecipeEditorTab;
  onActiveTabChange: (tab: RecipeEditorTab) => void;
  onClose: () => void;
  isSaving?: boolean;
  onDelete: (recipeId: string) => Promise<void> | void;
  onSave: (payload: UpsertRecipeInput) => Promise<void> | void;
};

type RecipeFormState = {
  name: string;
  category: RecipeCategory;
  serves: number;
  wastagePercent: number;
  gpTargetPercent: number;
  instructions: string;
  steps: string[];
  allergens: string[];
};

const CATEGORIES: Array<{ value: RecipeCategory; label: string }> = [
  { value: "mains", label: "Mains" },
  { value: "sides", label: "Sides" },
  { value: "drinks", label: "Drinks" },
  { value: "desserts", label: "Desserts" },
  { value: "prep", label: "Prep" },
  { value: "other", label: "Other" },
];

const ALLERGENS = [
  "Gluten",
  "Milk",
  "Egg",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
  "Peanut",
  "Tree Nuts",
] as const;

const INGREDIENT_UNITS = ["g", "kg", "ml", "l", "ea"] as const;

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function createDefaultForm(recipe: RecipeDetail | null): RecipeFormState {
  if (recipe) {
    return {
      name: recipe.name,
      category: recipe.category,
      serves: recipe.serves,
      wastagePercent: Math.round(recipe.wastagePercent),
      gpTargetPercent: recipe.gpPercent > 0 ? recipe.gpPercent : 65,
      instructions: recipe.instructions,
      steps: recipe.steps.length > 0 ? recipe.steps : [""],
      allergens: recipe.allergens,
    };
  }

  return {
    name: "",
    category: "mains",
    serves: 1,
    wastagePercent: 0,
    gpTargetPercent: 65,
    instructions: "",
    steps: [""],
    allergens: [],
  };
}

function createDefaultIngredients(recipe: RecipeDetail | null): RecipeIngredient[] {
  if (!recipe) {
    return [];
  }

  return recipe.ingredients.map((ingredient) => ({
    id: ingredient.id,
    ingredientId: ingredient.ingredientId ?? null,
    name: ingredient.name,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    unitCostCents: ingredient.unitCostCents,
    isSubRecipe: ingredient.isSubRecipe,
  }));
}

function createEmptyIngredient(): RecipeIngredient {
  return {
    id: crypto.randomUUID(),
    ingredientId: null,
    name: "",
    quantity: 0,
    unit: "g",
    unitCostCents: 0,
    isSubRecipe: false,
  };
}

export function RecipeEditorDrawerContent({
  organisation,
  venue,
  recipe,
  activeTab,
  onActiveTabChange,
  onClose,
  isSaving,
  onDelete,
  onSave,
}: RecipeEditorDrawerContentProps) {
  const isNewRecipe = recipe === null;

  const [form, setForm] = useState<RecipeFormState>(() => createDefaultForm(recipe));
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(() => createDefaultIngredients(recipe));
  const [newIngredientDialogOpen, setNewIngredientDialogOpen] = useState(false);
  const [targetIngredientRowIndex, setTargetIngredientRowIndex] = useState<number | null>(null);

  const ingredientSelectorQuery = useIngredientSelectorQuery({
    organisationSlug: organisation,
    venueSlug: venue,
  });
  const ingredientOptions = ingredientSelectorQuery.data ?? [];
  const { createIngredient } = useIngredientMutations({
    organisationSlug: organisation,
    venueSlug: venue,
  });

  useEffect(() => {
    setForm(createDefaultForm(recipe));
    setIngredients(createDefaultIngredients(recipe));
  }, [recipe]);

  const totalIngredientCost = useMemo(() => {
    return ingredients.reduce((sum, ingredient) => {
      return sum + Math.round(Math.max(0, ingredient.quantity) * Math.max(0, ingredient.unitCostCents));
    }, 0);
  }, [ingredients]);

  const wasteCost = useMemo(() => {
    return Math.round(totalIngredientCost * (form.wastagePercent / 100));
  }, [form.wastagePercent, totalIngredientCost]);

  const totalBatchCost = totalIngredientCost + wasteCost;
  const costPerServe = form.serves > 0 ? Math.round(totalBatchCost / form.serves) : 0;
  const suggestedPrice = useMemo(() => {
    const gpMultiplier = 1 - form.gpTargetPercent / 100;
    return gpMultiplier > 0 ? Math.round(costPerServe / gpMultiplier) : 0;
  }, [costPerServe, form.gpTargetPercent]);
  const suggestedPriceIncGst = useMemo(() => Math.round(suggestedPrice * 1.1), [suggestedPrice]);

  const canPublish = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.serves > 0 &&
      ingredients.length > 0 &&
      ingredients.every((ingredient) => ingredient.name.trim().length > 0 && ingredient.quantity > 0) &&
      form.steps.some((step) => step.trim().length > 0)
    );
  }, [form.name, form.serves, form.steps, ingredients]);

  function updateIngredient(
    index: number,
    field: keyof RecipeIngredient,
    value: RecipeIngredient[keyof RecipeIngredient]
  ) {
    setIngredients((currentIngredients) => {
      const updatedIngredients = [...currentIngredients];
      const target = updatedIngredients[index];
      if (!target) {
        return currentIngredients;
      }
      updatedIngredients[index] = { ...target, [field]: value };
      return updatedIngredients;
    });
  }

  function selectIngredientForRow(index: number, ingredientId: string) {
    const selected = ingredientOptions.find((option) => option.id === ingredientId);
    if (!selected) {
      return;
    }

    setIngredients((currentIngredients) => {
      const updatedIngredients = [...currentIngredients];
      const target = updatedIngredients[index];
      if (!target) {
        return currentIngredients;
      }
      updatedIngredients[index] = {
        ...target,
        ingredientId: selected.id,
        name: selected.name,
        unit: selected.unit,
        unitCostCents: selected.costPerUnitCents,
      };
      return updatedIngredients;
    });
  }

  async function createIngredientInline(payload: UpsertIngredientInput) {
    const created = await createIngredient.mutateAsync({
      organisationSlug: organisation,
      venueSlug: venue,
      payload,
    });

    if (targetIngredientRowIndex !== null) {
      setIngredients((currentIngredients) => {
        const updatedIngredients = [...currentIngredients];
        const target = updatedIngredients[targetIngredientRowIndex];
        if (!target) {
          return currentIngredients;
        }
        updatedIngredients[targetIngredientRowIndex] = {
          ...target,
          ingredientId: created.id,
          name: created.name,
          unit: created.unit,
          unitCostCents: created.costPerUnitCents,
        };
        return updatedIngredients;
      });
    }

    setNewIngredientDialogOpen(false);
    setTargetIngredientRowIndex(null);
    toast.success("Ingredient created and assigned");
  }

  function moveIngredient(index: number, direction: "up" | "down") {
    setIngredients((currentIngredients) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= currentIngredients.length) {
        return currentIngredients;
      }

      const updatedIngredients = [...currentIngredients];
      const [movedIngredient] = updatedIngredients.splice(index, 1);
      if (!movedIngredient) {
        return currentIngredients;
      }
      updatedIngredients.splice(nextIndex, 0, movedIngredient);
      return updatedIngredients;
    });
  }

  function toggleAllergen(allergen: string, checked: boolean) {
    setForm((currentForm) => {
      if (checked) {
        return { ...currentForm, allergens: [...currentForm.allergens, allergen] };
      }
      return {
        ...currentForm,
        allergens: currentForm.allergens.filter((item) => item !== allergen),
      };
    });
  }

  async function saveRecipe(nextStatus: RecipeEditorRecipe["status"]) {
    if (!form.name.trim()) {
      toast.error("Recipe name is required");
      return;
    }

    if (nextStatus === "published" && !canPublish) {
      toast.error("Add recipe name, ingredients, and at least one method step before publishing");
      return;
    }

    try {
      await onSave({
        name: form.name.trim(),
        description: "",
        category: form.category,
        serves: Math.max(1, form.serves),
        wastagePercent: form.wastagePercent,
        gpTargetPercent: form.gpTargetPercent,
        costPerServe,
        suggestedPrice: suggestedPriceIncGst,
        status: nextStatus,
        instructions: form.instructions,
        ingredients: ingredients.map((ingredient) => ({
          ingredientId: ingredient.ingredientId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          unitCostCents: ingredient.unitCostCents,
          isSubRecipe: ingredient.isSubRecipe,
        })),
        steps: form.steps,
        allergens: form.allergens,
      });
      toast.success(
        nextStatus === "published"
          ? "Recipe published"
          : "Recipe saved as draft"
      );
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save recipe"
      );
    }
  }

  async function deleteRecipe() {
    if (!recipe) {
      onClose();
      return;
    }
    if (!confirm(`Delete ${recipe.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await onDelete(recipe.id);
      toast.success("Recipe deleted");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete recipe"
      );
    }
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{isNewRecipe ? "New Recipe" : form.name || "Recipe Editor"}</h2>
            <p className="text-xs text-muted-foreground">
              {isNewRecipe ? "Create recipe details and costing" : "Edit recipe details and costing"} in-place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isNewRecipe ? (
              <Badge variant={recipe?.status === "published" ? "default" : "secondary"}>{recipe?.status}</Badge>
            ) : null}
            {!isNewRecipe ? (
              <Button variant="destructive" size="sm" className="gap-1.5" onClick={deleteRecipe}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void saveRecipe("draft")}
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => void saveRecipe("published")}
              disabled={!canPublish || isSaving}
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4 md:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => onActiveTabChange(value as RecipeEditorTab)}
          className="h-full min-h-0"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
            <TabsTrigger value="method">Method</TabsTrigger>
            <TabsTrigger value="allergens">Allergens</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <TabsContent value="details" className="mt-3">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recipe Details</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recipe-name">Name</Label>
                    <Input
                      id="recipe-name"
                      value={form.name}
                      onChange={(event) => setForm((currentForm) => ({ ...currentForm, name: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(value) =>
                        setForm((currentForm) => ({ ...currentForm, category: value as RecipeCategory }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipe-serves">Serves</Label>
                    <Input
                      id="recipe-serves"
                      type="number"
                      min={1}
                      value={form.serves}
                      onChange={(event) =>
                        setForm((currentForm) => ({ ...currentForm, serves: Number(event.target.value) || 1 }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipe-waste">Waste %</Label>
                    <Input
                      id="recipe-waste"
                      type="number"
                      min={0}
                      max={100}
                      value={form.wastagePercent}
                      onChange={(event) =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          wastagePercent: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ingredients" className="mt-3">
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Ingredients
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setIngredients((list) => [...list, createEmptyIngredient()])}
                  >
                    <Plus className="h-4 w-4" />
                    Add Ingredient
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-28 text-right">Line Cost</TableHead>
                      <TableHead className="w-16" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ingredients.map((ingredient, index) => {
                      const lineCost = Math.round(ingredient.quantity * ingredient.unitCostCents);
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell>
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Select
                                value={ingredient.ingredientId ?? "manual"}
                                onValueChange={(value) => {
                                  if (value === "manual") {
                                    updateIngredient(index, "ingredientId", null);
                                    return;
                                  }
                                  selectIngredientForRow(index, value);
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select ingredient" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">Manual entry</SelectItem>
                                  {ingredientOptions.map((option) => (
                                    <SelectItem key={option.id} value={option.id}>
                                      {option.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTargetIngredientRowIndex(index);
                                  setNewIngredientDialogOpen(true);
                                }}
                              >
                                New
                              </Button>
                            </div>
                            <Input
                              className="mt-2"
                              value={ingredient.name}
                              onChange={(event) => updateIngredient(index, "name", event.target.value)}
                              placeholder="Ingredient name"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={ingredient.quantity}
                              onChange={(event) => updateIngredient(index, "quantity", Number(event.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={ingredient.unit}
                              onValueChange={(value) =>
                                updateIngredient(index, "unit", value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from(new Set([...INGREDIENT_UNITS, ingredient.unit])).map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{formatCurrency(lineCost)}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => moveIngredient(index, "up")}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => moveIngredient(index, "down")}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() =>
                                  setIngredients((list) =>
                                    list.filter((_, ingredientIndex) => ingredientIndex !== index)
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="method" className="mt-3">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Method</h3>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    rows={4}
                    value={form.instructions}
                    onChange={(event) =>
                      setForm((currentForm) => ({ ...currentForm, instructions: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Steps</Label>
                  {form.steps.map((step, index) => (
                    <Input
                      key={`step-${index}`}
                      value={step}
                      onChange={(event) =>
                        setForm((currentForm) => {
                          const nextSteps = [...currentForm.steps];
                          nextSteps[index] = event.target.value;
                          return { ...currentForm, steps: nextSteps };
                        })
                      }
                      placeholder={`Step ${index + 1}`}
                    />
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setForm((currentForm) => ({ ...currentForm, steps: [...currentForm.steps, ""] }))}
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="allergens" className="mt-3">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Allergens</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ALLERGENS.map((allergen) => {
                    const checked = form.allergens.includes(allergen);
                    return (
                      <label key={allergen} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(state) => toggleAllergen(allergen, state === true)}
                        />
                        <span>{allergen}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <div className="border-t bg-background p-4 md:p-5">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Costing</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Ingredient Cost</p>
              <p className="text-base font-semibold tabular-nums">{formatCurrency(totalIngredientCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Waste</p>
              <p className="text-base font-semibold tabular-nums">{formatCurrency(wasteCost)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Cost / Serve</p>
              <p className="text-base font-semibold tabular-nums">{formatCurrency(costPerServe)}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Batch Cost</p>
              <p className="text-base font-semibold tabular-nums">{formatCurrency(totalBatchCost)}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,14rem),minmax(0,1fr)]">
            <div className="space-y-1">
              <Label htmlFor="recipe-gp-target">GP Target %</Label>
              <Input
                id="recipe-gp-target"
                type="number"
                min={1}
                max={95}
                value={form.gpTargetPercent}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    gpTargetPercent: Math.min(95, Math.max(1, Number(event.target.value) || 1)),
                  }))
                }
              />
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground">Suggested Sell Price</p>
              <p className="text-lg font-semibold tabular-nums">{formatCurrency(suggestedPriceIncGst)}</p>
              <p className="text-xs text-muted-foreground">ex GST {formatCurrency(suggestedPrice)}</p>
            </div>
          </div>
          <div
            className={cn(
              "rounded-md border p-3 text-xs",
              canPublish
                ? "border-emerald-300/60 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                : "border-amber-300/60 text-amber-700 dark:border-amber-900 dark:text-amber-300"
            )}
          >
            <div className="mb-1 flex items-center gap-1.5 font-medium">
              {canPublish ? <BookOpen className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {canPublish ? "Ready to publish" : "Needs required fields"}
            </div>
            <p>
              {canPublish ? "All required fields are present." : "Add recipe name, ingredients, and at least one method step."}
            </p>
          </div>
        </div>
      </div>

      </div>
      <IngredientEditorDialog
        open={newIngredientDialogOpen}
        onOpenChange={(open) => {
          setNewIngredientDialogOpen(open);
          if (!open) {
            setTargetIngredientRowIndex(null);
          }
        }}
        mode="create"
        isSaving={createIngredient.isPending}
        onSubmit={createIngredientInline}
      />
    </>
  );
}
