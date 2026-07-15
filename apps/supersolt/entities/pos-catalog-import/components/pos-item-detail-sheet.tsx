"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CircleCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";
import { buildRecipePrefillFromPosLine } from "@/entities/pos-catalog-import/model/recipe-prefill";
import type { PosCatalogImportRow } from "@/entities/pos-catalog-import/model/types";
import {
  formatPrice,
  GpPill,
} from "@/entities/pos-catalog-import/components/pos-line-metrics";
import {
  RecipeEditorDrawerContent,
  type RecipeEditorPrefill,
  type RecipeEditorTab,
} from "@/entities/recipes/components/recipe-editor-drawer";
import { useRecipeMutations } from "@/entities/recipes/model/useRecipeMutations";
import { useRecipeQuery } from "@/entities/recipes/model/useRecipeQuery";
import type { UpsertRecipeInput } from "@/entities/recipes/model/types";
import { SearchCombobox, type SearchComboboxOption } from "@/components/molecules/search-combobox";
import { Badge } from "@workspace/ui/components/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Switch } from "@workspace/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { cn } from "@workspace/ui/lib/utils";

export const UNMAPPED_RECIPE_VALUE = "none";

type SheetTab = "item" | "recipe" | "modifiers";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Minimum viable recipe: mapped, has ingredient lines, and costs money. */
export function isRecipeReady(row: PosCatalogImportRow): boolean {
  return (
    row.recipeId !== null &&
    !row.recipeCostIncomplete &&
    (row.recipeIngredientCount ?? 0) > 0
  );
}

export function recipeReadinessLabel(row: PosCatalogImportRow): string {
  if (isRecipeReady(row)) return "Recipe ready";
  if (!row.recipeId) return "No recipe linked yet";
  return "Recipe incomplete — add ingredients to set cost";
}

export function PosItemDetailSheet({
  organisationSlug,
  venueSlug,
  row,
  open,
  onOpenChange,
  canWrite,
  recipeOptions,
  onShowOnMenuChange,
  onRecipeChange,
}: {
  organisationSlug: string;
  venueSlug: string;
  row: PosCatalogImportRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canWrite: boolean;
  recipeOptions: SearchComboboxOption[];
  onShowOnMenuChange: (menuItemId: string, showOnMenu: boolean) => void;
  onRecipeChange: (menuItemId: string, recipeId: string | null) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SheetTab>("item");
  const [editorTab, setEditorTab] = useState<RecipeEditorTab>("details");

  const menuItemId = row?.menuItemId ?? null;

  // Fresh item, fresh tabs — otherwise the previous item's state leaks over.
  useEffect(() => {
    setActiveTab("item");
    setEditorTab("details");
  }, [menuItemId]);

  const { createRecipe, updateRecipe, deleteRecipe } = useRecipeMutations({
    organisationSlug,
    venueSlug,
  });

  const recipeDetailQuery = useRecipeQuery({
    organisationSlug,
    venueSlug,
    recipeId: open ? (row?.recipeId ?? null) : null,
  });

  const modifiersQuery = useQuery({
    queryKey: ["pos-item-modifiers", organisationSlug, venueSlug, menuItemId],
    queryFn: async () => {
      const { data, error } = await posCatalogImportApi.get.modifiers({
        organisationSlug,
        venueSlug,
        menuItemId: menuItemId!,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: open && menuItemId !== null && (row?.modifierListCount ?? 0) > 0,
  });

  // Ingredient suggestions seed the create editor from the Square description.
  const suggestionsQuery = useQuery({
    queryKey: [
      "pos-catalog-import",
      organisationSlug,
      venueSlug,
      "recipe-ingredient-suggestions",
      menuItemId,
    ],
    enabled: open && row !== null && !row.recipeId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await posCatalogImportApi.get.recipeIngredientSuggestions({
        organisationSlug,
        venueSlug,
        menuItemId: menuItemId!,
      });
      if (error) return { suggestions: [] };
      return data;
    },
  });

  const createPrefill: RecipeEditorPrefill | undefined = useMemo(() => {
    if (!row || row.recipeId) return undefined;
    return {
      ...buildRecipePrefillFromPosLine(row),
      ingredientNames: (suggestionsQuery.data?.suggestions ?? []).map(
        (suggestion) => suggestion.name,
      ),
    };
  }, [row, suggestionsQuery.data]);

  async function invalidatePosList() {
    await queryClient.invalidateQueries({
      queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
    });
  }

  async function handleEditorSave(payload: UpsertRecipeInput) {
    if (!row) return;
    if (row.recipeId) {
      await updateRecipe.mutateAsync({
        organisationSlug,
        venueSlug,
        recipeId: row.recipeId,
        payload,
      });
    } else {
      const created = await createRecipe.mutateAsync({
        organisationSlug,
        venueSlug,
        payload,
      });
      const { error } = await posCatalogImportApi.put.recipe({
        organisationSlug,
        venueSlug,
        menuItemId: row.menuItemId,
        recipeId: created.id,
      });
      if (error) {
        throw new Error(error.message);
      }
    }
    await invalidatePosList();
  }

  async function handleEditorDelete(recipeId: string) {
    if (!row) return;
    await deleteRecipe.mutateAsync({ organisationSlug, venueSlug, recipeId });
    // Unmap so the POS line does not point at an archived recipe.
    await posCatalogImportApi.put.recipe({
      organisationSlug,
      venueSlug,
      menuItemId: row.menuItemId,
      recipeId: null,
    });
    await invalidatePosList();
  }

  async function toggleModifierList(modifierListId: string, enabled: boolean) {
    if (!row) return;
    const { error } = await posCatalogImportApi.patch.modifierListEnabled({
      organisationSlug,
      venueSlug,
      menuItemId: row.menuItemId,
      modifierListId,
      enabled,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({
      queryKey: ["pos-item-modifiers", organisationSlug, venueSlug, row.menuItemId],
    });
  }

  const ready = row ? isRecipeReady(row) : false;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-1/2 right-auto bottom-0 top-auto flex h-[85vh] w-full max-w-3xl -translate-x-1/2 flex-col overflow-hidden rounded-t-xl border"
      >
        <SheetTitle className="sr-only">
          {row ? `Edit ${row.name}` : "POS item"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Manage in-use status, recipe, and modifiers for this POS item.
        </SheetDescription>

        {row ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b p-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold leading-tight">{row.name}</h2>
                {ready ? (
                  <CircleCheck
                    className="size-4.5 text-[var(--brand-supersolt-primary)]"
                    aria-label="Recipe ready"
                  />
                ) : (
                  <TriangleAlert
                    className="size-4.5 text-amber-500"
                    aria-label={recipeReadinessLabel(row)}
                  />
                )}
                <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                  {row.sectionName}
                </Badge>
                {row.missingFromSquare ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400"
                  >
                    Missing from Square
                  </Badge>
                ) : row.status.toLowerCase() !== "active" ? (
                  <Badge variant="secondary" className="text-xs">
                    {row.status}
                  </Badge>
                ) : null}
              </div>
              {row.description ? (
                <p className="text-muted-foreground mt-1 text-sm">{row.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="tabular-nums">
                  <span className="text-muted-foreground">Price </span>
                  <span className="font-medium">{formatPrice(row.priceCents)}</span>
                </span>
                <span className="tabular-nums">
                  <span className="text-muted-foreground">Cost/serve </span>
                  <span className="font-medium">
                    {row.costPerServeCents !== null
                      ? formatPrice(row.costPerServeCents)
                      : "—"}
                  </span>
                </span>
                <GpPill gpPercent={row.gpPercent} />
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {row.lastSoldAt
                    ? `Last sold ${formatDate(row.lastSoldAt)}`
                    : "No sales recorded"}
                </span>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as SheetTab)}
              className="flex min-h-0 flex-1 flex-col gap-0"
            >
              <div className="border-b px-4 pt-2 sm:px-5">
                <TabsList className="w-full justify-start bg-transparent p-0">
                  <TabsTrigger value="item">Item</TabsTrigger>
                  <TabsTrigger value="recipe">
                    Recipe
                    {!ready ? (
                      <span
                        aria-hidden
                        className="ml-1.5 inline-block size-1.5 rounded-full bg-amber-500"
                      />
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="modifiers">
                    Modifiers ({row.modifierListCount})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="item"
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5"
              >
                {row.staleInUse ? (
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <p>
                      No sales in the last 30 days. If this item is no longer sold
                      here, turn <span className="font-medium">In use</span> off —
                      it will switch back on automatically if it sells again.
                    </p>
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-lg border p-3.5">
                  <div>
                    <p className="text-sm font-medium">In use</p>
                    <p className="text-muted-foreground text-xs">
                      Sold at this venue — counted for costing and consumption.
                    </p>
                  </div>
                  <Switch
                    checked={row.showOnMenu}
                    disabled={!canWrite}
                    onCheckedChange={(checked) =>
                      onShowOnMenuChange(row.menuItemId, checked)
                    }
                    aria-label={`In use for ${row.name}`}
                    className="data-[state=checked]:bg-[var(--brand-supersolt-primary)]"
                  />
                </div>

                <div
                  className={cn(
                    "flex items-start gap-2.5 rounded-lg border p-3.5 text-sm",
                    ready
                      ? "border-[color:color-mix(in_oklab,var(--brand-supersolt-primary)_40%,var(--border))] bg-[var(--brand-supersolt-primary)]/8"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
                  )}
                >
                  {ready ? (
                    <CircleCheck
                      className="mt-0.5 size-4 shrink-0 text-[var(--brand-supersolt-primary)]"
                      aria-hidden
                    />
                  ) : (
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  <div>
                    <p className="font-medium">{recipeReadinessLabel(row)}</p>
                    <p className={cn("text-xs", ready && "text-muted-foreground")}>
                      {ready
                        ? `${row.recipeName ?? "Recipe"} — ${row.recipeIngredientCount ?? 0} ingredient${(row.recipeIngredientCount ?? 0) === 1 ? "" : "s"}`
                        : "Open the Recipe tab to link or build the recipe."}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="recipe"
                className="min-h-0 flex-1 overflow-y-auto"
              >
                <div className="space-y-2 border-b p-4 sm:px-5">
                  <p className="text-sm font-medium">Linked recipe</p>
                  <SearchCombobox
                    value={row.recipeId ?? UNMAPPED_RECIPE_VALUE}
                    disabled={!canWrite}
                    ariaLabel={`Recipe for ${row.name}`}
                    placeholder="Map recipe"
                    searchPlaceholder="Search recipes…"
                    emptyLabel="No recipe matches."
                    options={recipeOptions}
                    onValueChange={(value) =>
                      onRecipeChange(
                        row.menuItemId,
                        value === UNMAPPED_RECIPE_VALUE ? null : value,
                      )
                    }
                  />
                  {!row.recipeId ? (
                    <p className="text-muted-foreground text-xs">
                      No recipe linked — build one below and it is linked to this
                      POS item on save.
                    </p>
                  ) : null}
                </div>

                {/* The editor sizes itself h-full for the recipes drawer; here it
                    flows at natural height and this tab scrolls as one column. */}
                <div className="[&>div:first-child]:h-auto">
                  {row.recipeId && recipeDetailQuery.isLoading ? (
                    <div className="space-y-3 p-4 sm:p-5" aria-busy="true">
                      <Skeleton className="h-8 w-56" />
                      <Skeleton className="h-9 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ) : (
                    <RecipeEditorDrawerContent
                      organisation={organisationSlug}
                      venue={venueSlug}
                      recipe={row.recipeId ? (recipeDetailQuery.data ?? null) : null}
                      prefill={createPrefill}
                      activeTab={editorTab}
                      onActiveTabChange={setEditorTab}
                      onClose={() => setActiveTab("item")}
                      isSaving={createRecipe.isPending || updateRecipe.isPending}
                      onDelete={(recipeId) => handleEditorDelete(recipeId)}
                      onSave={handleEditorSave}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent
                value="modifiers"
                className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5"
              >
                {row.modifierListCount === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No modifier lists attached to this item in Square.
                  </p>
                ) : modifiersQuery.isLoading ? (
                  <p className="text-muted-foreground text-sm" aria-busy="true">
                    Loading modifiers…
                  </p>
                ) : modifiersQuery.data && modifiersQuery.data.lists.length > 0 ? (
                  <>
                    <p className="text-muted-foreground text-xs">
                      Toggle which Square modifier lists apply to this item.
                      Changes affect every variation of the item.
                    </p>
                    {modifiersQuery.data.lists.map((list) => (
                      <div
                        key={list.modifierListId}
                        className={cn(
                          "space-y-2 rounded-lg border p-3.5",
                          !list.enabled && "opacity-60",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{list.name}</p>
                            <p className="text-muted-foreground text-xs">
                              {list.selectionType === "single"
                                ? "Pick one"
                                : "Multi-select"}
                              {" · "}
                              {list.modifiers.length} option
                              {list.modifiers.length === 1 ? "" : "s"}
                            </p>
                          </div>
                          <Switch
                            checked={list.enabled}
                            disabled={!canWrite}
                            onCheckedChange={(checked) =>
                              void toggleModifierList(list.modifierListId, checked)
                            }
                            aria-label={`Enable ${list.name} for ${row.name}`}
                            className="data-[state=checked]:bg-[var(--brand-supersolt-primary)]"
                          />
                        </div>
                        <ul className="space-y-0.5">
                          {list.modifiers.map((modifier) => (
                            <li
                              key={modifier.modifierId}
                              className="flex items-center justify-between gap-2 text-sm"
                            >
                              <span>{modifier.name}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {modifier.priceCents > 0
                                  ? `+${formatPrice(modifier.priceCents)}`
                                  : "—"}
                              </span>
                            </li>
                          ))}
                          {list.modifiers.length === 0 ? (
                            <li className="text-muted-foreground text-sm">
                              No options
                            </li>
                          ) : null}
                        </ul>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No modifiers attached.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
