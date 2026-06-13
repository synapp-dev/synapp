"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryNormalisationApi } from "@/entities/inventory-normalisation/api/endpoints";
import { inventoryNormalisationKeys } from "@/entities/inventory-normalisation/model/keys";
import { inventorySetupKeys } from "@/entities/inventory-setup/model/keys";
import { ingredientsKeys } from "@/entities/ingredients/model/keys";
import type { NormaliseCommitInput } from "@/entities/inventory-normalisation/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

export function useNormalisationMutations(scoped: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: inventoryNormalisationKeys.all });
    await queryClient.invalidateQueries({
      queryKey: inventorySetupKeys.progress(scoped.organisationSlug, scoped.venueSlug),
    });
    await queryClient.invalidateQueries({ queryKey: ingredientsKeys.all() });
  };

  const suggest = useMutation({
    mutationFn: async (rawItemId: string) => {
      const { data, error } = await inventoryNormalisationApi.post.suggest({
        ...scoped,
        rawItemId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const commit = useMutation({
    mutationFn: async (payload: NormaliseCommitInput) => {
      const { data, error } = await inventoryNormalisationApi.post.commit({
        ...scoped,
        payload,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const skip = useMutation({
    mutationFn: async (rawItemId: string) => {
      const { data, error } = await inventoryNormalisationApi.post.skip({
        ...scoped,
        rawItemId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  const unskip = useMutation({
    mutationFn: async (rawItemId: string) => {
      const { data, error } = await inventoryNormalisationApi.post.unskip({
        ...scoped,
        rawItemId,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: invalidate,
  });

  return { suggest, commit, skip, unskip };
}
