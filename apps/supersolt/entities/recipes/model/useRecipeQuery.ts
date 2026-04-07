"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { recipesKeys } from "@/entities/recipes/model/keys";
import type { RecipeDetail } from "@/entities/recipes/model/types";

type UseRecipeQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  recipeId: string | null;
};

export function useRecipeQuery(
  input: UseRecipeQueryInput
): UseQueryResult<RecipeDetail, Error> {
  return useQuery<RecipeDetail, Error>({
    queryKey: recipesKeys.detail(
      input.organisationSlug,
      input.venueSlug,
      input.recipeId ?? "none"
    ),
    enabled: Boolean(input.recipeId),
    queryFn: async () => {
      if (!input.recipeId) {
        throw new Error("Missing recipe id");
      }

      const { data, error } = await recipesApi.get.detail({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        recipeId: input.recipeId,
      });
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Recipe not found");
      }
      return data;
    },
  });
}
