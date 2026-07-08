import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

type ScopedInput = { organisationSlug: string; venueSlug: string };

export type StorageLocationDto = { id: string; name: string; displayOrder?: number };

export type StockWizardSuggestRow = {
  ingredientId: string;
  name: string;
  unit: string;
  costPerUnitCents: number;
  currentStockLevel: number;
  suggestedQty: number;
  locationId: string | null;
  locationName: string | null;
  /** True when suggestedQty/location echo an existing saved count (review). */
  saved: boolean;
};

export type StockWizardSuggestResponse = {
  category: string;
  rows: StockWizardSuggestRow[];
  locations: Array<{ id: string; name: string }>;
};

export const stockWizardApi = {
  get: {
    storageLocations(input: ScopedInput): Promise<ApiResult<StorageLocationDto[]>> {
      return apiFetch<StorageLocationDto[]>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/storage-locations`,
      );
    },
  },
  post: {
    createStorageLocation(
      input: ScopedInput & { name: string; displayOrder?: number },
    ): Promise<ApiResult<StorageLocationDto>> {
      return apiFetch<StorageLocationDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/storage-locations`,
        {
          method: "POST",
          body: JSON.stringify({ name: input.name, displayOrder: input.displayOrder }),
        },
      );
    },
    suggest(
      input: ScopedInput & { category: string },
    ): Promise<ApiResult<StockWizardSuggestResponse>> {
      return apiFetch<StockWizardSuggestResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/storage/stock-wizard-suggest`,
        { method: "POST", body: JSON.stringify({ category: input.category }) },
      );
    },
    apply(
      input: ScopedInput & {
        items: Array<{ ingredientId: string; quantity: number; locationId: string | null }>;
      },
    ): Promise<ApiResult<{ updated: number }>> {
      return apiFetch<{ updated: number }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/storage/stock-wizard-apply`,
        { method: "POST", body: JSON.stringify({ items: input.items }) },
      );
    },
  },
};
