"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ingredientsApi } from "@/entities/ingredients/api/endpoints";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import type {
  IngredientListResponse,
  IngredientSelectorOption,
  IngredientSummary,
} from "@/entities/ingredients/model/types";

type UseIngredientsQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  supplierId?: string;
  page?: number;
  pageSize?: number;
};

export function useIngredientsQuery(
  input: UseIngredientsQueryInput
): UseQueryResult<IngredientListResponse, Error> {
  return useQuery<IngredientListResponse, Error>({
    queryKey: ingredientsKeys.list(input.organisationSlug, input.venueSlug, {
      search: input.search,
      category: input.category,
      status: input.status,
      supplierId: input.supplierId,
      page: input.page,
      pageSize: input.pageSize,
    }),
    queryFn: async () => {
      const { data, error } = await ingredientsApi.get.list(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { ingredients: [] as IngredientSummary[], total: 0 };
    },
  });
}

export function useIngredientSelectorQuery(
  input: Pick<UseIngredientsQueryInput, "organisationSlug" | "venueSlug">
): UseQueryResult<IngredientSelectorOption[], Error> {
  return useQuery<IngredientSelectorOption[], Error>({
    queryKey: ingredientsKeys.selector(input.organisationSlug, input.venueSlug),
    queryFn: async () => {
      const { data, error } = await ingredientsApi.get.list({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        status: "active",
        page: 1,
        // Full catalog for select-style pickers — server caps at 1000.
        pageSize: 1000,
      });
      if (error) {
        throw new Error(error.message);
      }

      return (data?.ingredients ?? []).map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        costPerUnitCents: ingredient.costPerUnitCents,
        category: ingredient.category,
        status: ingredient.status,
      }));
    },
  });
}
