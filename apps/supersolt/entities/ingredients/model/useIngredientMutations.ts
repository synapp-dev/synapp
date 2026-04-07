"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ingredientsApi } from "@/entities/ingredients/api/endpoints";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import type { UpsertIngredientInput } from "@/entities/ingredients/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

type CreateIngredientInput = ScopedInput & {
  payload: UpsertIngredientInput;
};

type UpdateIngredientInput = ScopedInput & {
  ingredientId: string;
  payload: UpsertIngredientInput;
};

type DeleteIngredientInput = ScopedInput & {
  ingredientId: string;
};

export function useIngredientMutations(scope: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidateScopedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: ingredientsKeys.scope(scope.organisationSlug, scope.venueSlug),
    });
  };

  const createIngredient = useMutation({
    mutationFn: async (input: CreateIngredientInput) => {
      const { data, error } = await ingredientsApi.post.create(
        input.organisationSlug,
        input.venueSlug,
        input.payload
      );

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to create ingredient");
      }
      return data;
    },
    onSuccess: invalidateScopedQueries,
  });

  const updateIngredient = useMutation({
    mutationFn: async (input: UpdateIngredientInput) => {
      const { data, error } = await ingredientsApi.patch.update(input);
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to update ingredient");
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.invalidateQueries({
        queryKey: ingredientsKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.ingredientId
        ),
      });
    },
  });

  const deleteIngredient = useMutation({
    mutationFn: async (input: DeleteIngredientInput) => {
      const { data, error } = await ingredientsApi.delete.byId(input);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.removeQueries({
        queryKey: ingredientsKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.ingredientId
        ),
      });
    },
  });

  return {
    createIngredient,
    updateIngredient,
    deleteIngredient,
  };
}
