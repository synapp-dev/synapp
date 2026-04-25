"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { menuItemsApi } from "@/entities/menu-items/api/endpoints";
import { menuItemsKeys } from "@/entities/menu-items/model/keys";
import type { UpsertMenuItemInput } from "@/entities/menu-items/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

type CreateMenuItemInput = ScopedInput & {
  payload: UpsertMenuItemInput;
};

type UpdateMenuItemInput = ScopedInput & {
  menuItemId: string;
  payload: UpsertMenuItemInput;
};

type DeleteMenuItemInput = ScopedInput & {
  menuItemId: string;
};

export function useMenuItemMutations(scope: ScopedInput) {
  const queryClient = useQueryClient();

  const invalidateScopedQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: menuItemsKeys.scope(scope.organisationSlug, scope.venueSlug),
    });
  };

  const createMenuItem = useMutation({
    mutationFn: async (input: CreateMenuItemInput) => {
      const { data, error } = await menuItemsApi.post.create(
        input.organisationSlug,
        input.venueSlug,
        input.payload
      );
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to create menu line");
      }
      return data;
    },
    onSuccess: invalidateScopedQueries,
  });

  const updateMenuItem = useMutation({
    mutationFn: async (input: UpdateMenuItemInput) => {
      const { data, error } = await menuItemsApi.patch.update(input);
      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Failed to update menu line");
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.invalidateQueries({
        queryKey: menuItemsKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.menuItemId
        ),
      });
    },
  });

  const deleteMenuItem = useMutation({
    mutationFn: async (input: DeleteMenuItemInput) => {
      const { data, error } = await menuItemsApi.delete.byId(input);
      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidateScopedQueries();
      await queryClient.removeQueries({
        queryKey: menuItemsKeys.detail(
          variables.organisationSlug,
          variables.venueSlug,
          variables.menuItemId
        ),
      });
    },
  });

  return {
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}
