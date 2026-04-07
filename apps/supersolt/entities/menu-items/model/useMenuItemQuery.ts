"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { menuItemsApi } from "@/entities/menu-items/api/endpoints";
import { menuItemsKeys } from "@/entities/menu-items/model/keys";
import type { MenuItemDetail } from "@/entities/menu-items/model/types";

type UseMenuItemQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  menuItemId: string | null;
};

export function useMenuItemQuery(
  input: UseMenuItemQueryInput
): UseQueryResult<MenuItemDetail, Error> {
  return useQuery<MenuItemDetail, Error>({
    queryKey: menuItemsKeys.detail(
      input.organisationSlug,
      input.venueSlug,
      input.menuItemId ?? "none"
    ),
    enabled: Boolean(input.menuItemId),
    queryFn: async () => {
      if (!input.menuItemId) {
        throw new Error("Missing menu item id");
      }

      const { data, error } = await menuItemsApi.get.detail({
        organisationSlug: input.organisationSlug,
        venueSlug: input.venueSlug,
        menuItemId: input.menuItemId,
      });

      if (error) {
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Menu item not found");
      }

      return data;
    },
  });
}
