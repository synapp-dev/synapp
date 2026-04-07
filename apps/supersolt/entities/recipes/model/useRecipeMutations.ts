"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recipesApi } from "@/entities/recipes/api/endpoints";
import { recipesKeys } from "@/entities/recipes/model/keys";
import type { UpsertRecipeInput } from "@/entities/recipes/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

type CreateRecipeInput = ScopedInput & {
  payload: UpsertRecipeInput;
};

type UpdateRecipeInput = ScopedInput & {
  recipeId: string;
  payload: UpsertRecipeInput;
};

type DeleteRecipeInput = ScopedInput & {
  recipeId: string;
};

export function useRecipeMutations(scope: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidateScopedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: recipesKeys.scope(scope.organisationSlug, scope.venueSlug),
    });
  };

  const createRecipe = useMutation({
    mutationFn: async (input: CreateRecipeInput) => {
      const { data, error } = await recipesApi.post.create(
        input.organisationSlug,
        input.venueSlug,
        input.payload
      );
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to create recipe");
      }
      return data;
    },
    onSuccess: invalidateScopedQueries,
  });

  const updateRecipe = useMutation({
    mutationFn: async (input: UpdateRecipeInput) => {
      const { data, error } = await recipesApi.patch.update(input);
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to update recipe");
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.invalidateQueries({
        queryKey: recipesKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.recipeId
        ),
      });
    },
  });

  const deleteRecipe = useMutation({
    mutationFn: async (input: DeleteRecipeInput) => {
      const { data, error } = await recipesApi.delete.byId(input);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.removeQueries({
        queryKey: recipesKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.recipeId
        ),
      });
    },
  });

  return {
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
}
