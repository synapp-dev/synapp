import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  MenuItemDetail,
  MenuItemListResponse,
  UpsertMenuItemInput,
} from "@/entities/menu-items/model/types";

type ListMenuItemsInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  sectionName?: string;
  page?: number;
  pageSize?: number;
};

type GetMenuItemInput = {
  organisationSlug: string;
  venueSlug: string;
  menuItemId: string;
};

type UpdateMenuItemInput = GetMenuItemInput & {
  payload: UpsertMenuItemInput;
};

export const menuItemsApi = {
  get: {
    list(input: ListMenuItemsInput): Promise<ApiResult<MenuItemListResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) {
        params.set("search", input.search.trim());
      }
      if (input.sectionName) {
        params.set("sectionName", input.sectionName);
      }
      if (input.page) {
        params.set("page", String(input.page));
      }
      if (input.pageSize) {
        params.set("pageSize", String(input.pageSize));
      }

      const query = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/menu-items`;
      return apiFetch<MenuItemListResponse>(query ? `${path}?${query}` : path);
    },
    detail(input: GetMenuItemInput): Promise<ApiResult<MenuItemDetail>> {
      return apiFetch<MenuItemDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/menu-items/${input.menuItemId}`
      );
    },
  },
  post: {
    create(
      organisationSlug: string,
      venueSlug: string,
      payload: UpsertMenuItemInput
    ): Promise<ApiResult<MenuItemDetail>> {
      return apiFetch<MenuItemDetail>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/menu-items`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
  },
  patch: {
    update(input: UpdateMenuItemInput): Promise<ApiResult<MenuItemDetail>> {
      return apiFetch<MenuItemDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/menu-items/${input.menuItemId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.payload),
        }
      );
    },
  },
  delete: {
    byId(input: GetMenuItemInput): Promise<ApiResult<{ deleted: boolean }>> {
      return apiFetch<{ deleted: boolean }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/menu-items/${input.menuItemId}`,
        { method: "DELETE" }
      );
    },
  },
};
