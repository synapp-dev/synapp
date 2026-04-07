"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { recipesKeys } from "@/entities/recipes/model/keys";
import type {
  RecipeListResponse,
  RecipeSummary,
} from "@/entities/recipes/model/types";

type UseRecipesQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export function useRecipesQuery(
  input: UseRecipesQueryInput
): UseQueryResult<RecipeListResponse, Error> {
  return useQuery<RecipeListResponse, Error>({
    queryKey: recipesKeys.list(input.organisationSlug, input.venueSlug, {
      search: input.search,
      category: input.category,
      status: input.status,
      page: input.page,
      pageSize: input.pageSize,
    }),
    queryFn: async () => {
      const { data, error } = await recipesApi.get.list(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { recipes: [] as RecipeSummary[], total: 0 };
    },
  });
}
