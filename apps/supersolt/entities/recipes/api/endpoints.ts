import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  RecipeDetail,
  RecipeListResponse,
  UpsertRecipeInput,
} from "@/entities/recipes/model/types";

type ListRecipesInput = {
  organisationSlug: string;
  venueSlug: string;
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

type GetRecipeInput = {
  organisationSlug: string;
  venueSlug: string;
  recipeId: string;
};

type UpdateRecipeInput = GetRecipeInput & {
  payload: UpsertRecipeInput;
};

export const recipesApi = {
  get: {
    list(input: ListRecipesInput): Promise<ApiResult<RecipeListResponse>> {
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
      if (input.page) {
        params.set("page", String(input.page));
      }
      if (input.pageSize) {
        params.set("pageSize", String(input.pageSize));
      }

      const query = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/recipes`;
      return apiFetch<RecipeListResponse>(query ? `${path}?${query}` : path);
    },
    detail(input: GetRecipeInput): Promise<ApiResult<RecipeDetail>> {
      return apiFetch<RecipeDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/recipes/${input.recipeId}`
      );
    },
  },
  post: {
    create(
      organisationSlug: string,
      venueSlug: string,
      payload: UpsertRecipeInput
    ): Promise<ApiResult<RecipeDetail>> {
      return apiFetch<RecipeDetail>(
        `/organisations/${organisationSlug}/venues/${venueSlug}/recipes`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
    },
  },
  patch: {
    update(input: UpdateRecipeInput): Promise<ApiResult<RecipeDetail>> {
      return apiFetch<RecipeDetail>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/recipes/${input.recipeId}`,
        {
          method: "PATCH",
          body: JSON.stringify(input.payload),
        }
      );
    },
  },
  delete: {
    byId(input: GetRecipeInput): Promise<ApiResult<{ deleted: boolean }>> {
      return apiFetch<{ deleted: boolean }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/recipes/${input.recipeId}`,
        { method: "DELETE" }
      );
    },
  },
};
