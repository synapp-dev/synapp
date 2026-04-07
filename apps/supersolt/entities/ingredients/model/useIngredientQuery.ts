"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { ingredientsApi } from "@/entities/ingredients/api/endpoints";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import type { IngredientDetail } from "@/entities/ingredients/model/types";

type UseIngredientQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  ingredientId: string | null;
};

export function useIngredientQuery(
  input: UseIngredientQueryInput
): UseQueryResult<IngredientDetail, Error> {
  return useQuery<IngredientDetail, Error>({
    queryKey: ingredientsKeys.detail(
      input.organisationSlug,
      input.venueSlug,
      input.ingredientId ?? "none"
    ),
    enabled: Boolean(input.ingredientId),
    queryFn: async () => {
      if (!input.ingredientId) {
        throw new Error("Missing ingredient id");
      }

      const { data, error } = await ingredientsApi.get.detail({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        ingredientId: input.ingredientId,
      });

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Ingredient not found");
      }

      return data;
    },
  });
}
