"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { menuItemsApi } from "@/entities/menu-items/api/endpoints";
import { menuItemsKeys } from "@/entities/menu-items/model/keys";
import type { MenuItemListResponse } from "@/entities/menu-items/model/types";

type UseMenuItemsQueryInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  sectionName?: string;
  page?: number;
  pageSize?: number;
};

export function useMenuItemsQuery(
  input: UseMenuItemsQueryInput
): UseQueryResult<MenuItemListResponse, Error> {
  return useQuery<MenuItemListResponse, Error>({
    queryKey: menuItemsKeys.list(input.organisationSlug, input.venueSlug, {
      search: input.search,
      sectionName: input.sectionName,
      page: input.page,
      pageSize: input.pageSize,
    }),
    queryFn: async () => {
      const { data, error } = await menuItemsApi.get.list(input);
      if (error) {
        throw new Error(error.message);
      }
      return data ?? { menuItems: [], total: 0, sections: [] };
    },
  });
}
