"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@workspace/ui/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  RecipeEditorDrawerContent,
  type RecipeEditorPrefill,
  type RecipeEditorTab,
} from "@/entities/recipes/components/recipe-editor-drawer";
import { useRecipeMutations } from "@/entities/recipes/model/useRecipeMutations";
import type { UpsertRecipeInput } from "@/entities/recipes/model/types";
import { posCatalogImportApi } from "@/entities/pos-catalog-import/api/endpoints";
import { posCatalogImportKeys } from "@/entities/pos-catalog-import/model/keys";

export type PosRecipeCreateTarget = {
  menuItemId: string;
  prefill: RecipeEditorPrefill;
};

export function PosRecipeCreateDrawer({
  organisationSlug,
  venueSlug,
  target,
  onOpenChange,
}: {
  organisationSlug: string;
  venueSlug: string;
  target: PosRecipeCreateTarget | null;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RecipeEditorTab>("details");
  const [isMapping, setIsMapping] = useState(false);
  const { createRecipe } = useRecipeMutations({
    organisationSlug,
    venueSlug,
  });

  const isOpen = target !== null;

  // Suggest ingredient lines from the Square description (best-effort; degrades
  // to no suggestions). Prefill is memoised so its identity is stable until the
  // target or suggestions change — otherwise the editor would reset on rerender.
  const suggestionsQuery = useQuery({
    queryKey: [
      "pos-catalog-import",
      organisationSlug,
      venueSlug,
      "recipe-ingredient-suggestions",
      target?.menuItemId,
    ],
    enabled: target !== null,
    staleTime: 60_000,
    queryFn: async () => {
      if (!target) return { suggestions: [] };
      const { data, error } = await posCatalogImportApi.get.recipeIngredientSuggestions({
        organisationSlug,
        venueSlug,
        menuItemId: target.menuItemId,
      });
      if (error) {
        return { suggestions: [] };
      }
      return data;
    },
  });

  const prefill: RecipeEditorPrefill | undefined = useMemo(() => {
    if (!target) return undefined;
    const ingredientNames = (suggestionsQuery.data?.suggestions ?? []).map(
      (suggestion) => suggestion.name,
    );
    return { ...target.prefill, ingredientNames };
  }, [target, suggestionsQuery.data]);

  async function handleSave(payload: UpsertRecipeInput) {
    if (!target) return;

    // Create the recipe, then auto-link it to the POS line via the existing
    // mapRecipe endpoint (which also recomputes cost/GP).
    const created = await createRecipe.mutateAsync({
      organisationSlug,
      venueSlug,
      payload,
    });

    setIsMapping(true);
    try {
      const { error } = await posCatalogImportApi.put.recipe({
        organisationSlug,
        venueSlug,
        menuItemId: target.menuItemId,
        recipeId: created.id,
      });
      if (error) {
        throw new Error(error.message);
      }
    } finally {
      setIsMapping(false);
    }

    await queryClient.invalidateQueries({
      queryKey: posCatalogImportKeys.list(organisationSlug, venueSlug),
    });
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) {
          setActiveTab("details");
        }
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="top"
        className={cn(
          "inset-x-1/2 right-auto top-0 bottom-14 flex w-full max-w-2xl",
          "-translate-x-1/2 flex-col overflow-hidden rounded-b-xl border md:w-[50vw]",
        )}
      >
        <SheetTitle className="sr-only">Create recipe for POS item</SheetTitle>
        <SheetDescription className="sr-only">
          Create a recipe prefilled from the selected POS line; it is linked
          automatically on save.
        </SheetDescription>
        {target ? (
          <RecipeEditorDrawerContent
            organisation={organisationSlug}
            venue={venueSlug}
            recipe={null}
            prefill={prefill}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
            onClose={() => onOpenChange(false)}
            isSaving={createRecipe.isPending || isMapping}
            onDelete={() => onOpenChange(false)}
            onSave={handleSave}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
