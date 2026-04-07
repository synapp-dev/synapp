import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  IngredientDetail,
  IngredientListResponse,
  UpsertIngredientInput,
} from "@/entities/ingredients/model/types";

type ListIngredientsInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  supplierId?: string;
  page?: number;
  pageSize?: number;
};

type GetIngredientInput = {
  organisationSlug: string;
  venueSlug: string;
  ingredientId: string;
};

type UpdateIngredientInput = GetIngredientInput & {
  payload: UpsertIngredientInput;
};

export const ingredientsApi = {
  get: {
    list(input: ListIngredientsInput): Promise<ApiResult<IngredientListResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) {
        params.set("search", input.search.trim());
      }
      if (input.category) {
        params.set("category", input.category);
      }
      if (input.status) {
        params.set("status", input.status);
      }
      if (input.supplierId) {
        params.set("supplierId", input.supplierId);
      }
      if (input.page) {
        params.set("page", String(input.page));
      }
      if (input.pageSize) {
        params.set("pageSize", String(input.pageSize));
      }

      const query = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/ingredients`;
      return apiFetch<IngredientListResponse>(query ? `${path}?${query}` : path);
    },
    detail(input: GetIngredientInput): Promise<ApiResult<IngredientDetail>> {
      return apiFetch<IngredientDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/ingredients/${input.ingredientId}`
      );
    },
  },
  post: {
    create(
      organisationSlug: string,
      venueSlug: string,
      payload: UpsertIngredientInput
    ): Promise<ApiResult<IngredientDetail>> {
      return apiFetch<IngredientDetail>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/ingredients`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
  },
  patch: {
    update(input: UpdateIngredientInput): Promise<ApiResult<IngredientDetail>> {
      return apiFetch<IngredientDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/ingredients/${input.ingredientId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.payload),
        }
      );
    },
  },
  delete: {
    byId(input: GetIngredientInput): Promise<ApiResult<{ deleted: boolean }>> {
      return apiFetch<{ deleted: boolean }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/ingredients/${input.ingredientId}`,
        {
          method: "DELETE",
        }
      );
    },
  },
};
