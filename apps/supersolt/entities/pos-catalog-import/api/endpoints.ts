import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  ImportFromSquareAcceptedResponse,
  PosCatalogImportListResponse,
  PosItemModifiersResponse,
  RecipeIngredientSuggestionsResponse,
  RecipeWizardSuggestion,
  SquareCatalogImportResult,
} from "@/entities/pos-catalog-import/model/types";
import type { ImportJobRow } from "@/entities/inventory-setup/model/import-job-types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

export const posCatalogImportApi = {
  get: {
    list(input: ScopedInput): Promise<ApiResult<PosCatalogImportListResponse>> {
      return apiFetch<PosCatalogImportListResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items`,
      );
    },
    activeImportJob(input: ScopedInput): Promise<ApiResult<ImportJobRow | null>> {
      return apiFetch<ImportJobRow | null>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs/active?jobType=square_catalog`,
      );
    },
    importJob(
      input: ScopedInput & { jobId: string },
    ): Promise<ApiResult<ImportJobRow | null>> {
      return apiFetch<ImportJobRow | null>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs/${input.jobId}`,
      );
    },
    modifiers(
      input: ScopedInput & { menuItemId: string },
    ): Promise<ApiResult<PosItemModifiersResponse>> {
      return apiFetch<PosItemModifiersResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items/${input.menuItemId}/modifiers`,
      );
    },
    recipeIngredientSuggestions(
      input: ScopedInput & { menuItemId: string },
    ): Promise<ApiResult<RecipeIngredientSuggestionsResponse>> {
      return apiFetch<RecipeIngredientSuggestionsResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items/${input.menuItemId}/recipe-ingredient-suggestions`,
      );
    },
  },
  post: {
    createImportJob(input: ScopedInput): Promise<ApiResult<ImportJobRow>> {
      return apiFetch<ImportJobRow>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-jobs`,
        {
          method: "POST",
          body: JSON.stringify({ jobType: "square_catalog" }),
        },
      );
    },
    importFromSquare(
      input: ScopedInput & { jobId?: string },
    ): Promise<ApiResult<SquareCatalogImportResult | ImportFromSquareAcceptedResponse>> {
      return apiFetch<SquareCatalogImportResult | ImportFromSquareAcceptedResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/import-from-square`,
        {
          method: "POST",
          body: JSON.stringify({ jobId: input.jobId }),
        },
      );
    },
    recipeWizardSuggest(
      input: ScopedInput & { menuItemId: string; regenerate?: boolean },
    ): Promise<ApiResult<RecipeWizardSuggestion>> {
      return apiFetch<RecipeWizardSuggestion>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/products/recipe-wizard-suggest`,
        {
          method: "POST",
          body: JSON.stringify({
            menuItemId: input.menuItemId,
            regenerate: input.regenerate ?? false,
          }),
        },
      );
    },
  },
  patch: {
    modifierListEnabled(
      input: ScopedInput & {
        menuItemId: string;
        modifierListId: string;
        enabled: boolean;
      },
    ): Promise<ApiResult<{ ok: true }>> {
      return apiFetch<{ ok: true }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items/${input.menuItemId}/modifiers/${input.modifierListId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: input.enabled }),
        },
      );
    },
    showOnMenu(
      input: ScopedInput & { menuItemId: string; showOnMenu: boolean },
    ): Promise<ApiResult<unknown>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items/${input.menuItemId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ showOnMenu: input.showOnMenu }),
        },
      );
    },
  },
  put: {
    recipe(
      input: ScopedInput & { menuItemId: string; recipeId: string | null },
    ): Promise<ApiResult<{ ok: true }>> {
      return apiFetch<{ ok: true }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/pos-items/${input.menuItemId}/recipe`,
        {
          method: "PUT",
          body: JSON.stringify({ recipeId: input.recipeId }),
        },
      );
    },
  },
};
