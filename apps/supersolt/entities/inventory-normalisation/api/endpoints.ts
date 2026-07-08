import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  NormalisationQueueResponse,
  NormalisationSuggestion,
  NormaliseCommitInput,
  NormaliseCommitResult,
} from "@/entities/inventory-normalisation/model/types";

type ScopedInput = {
  organisationSlug: string;
  venueSlug: string;
};

export type NormalisationMappingResponse = {
  rawDescription: string;
  rawUnit: string | null;
  lastUnitPriceCents: number | null;
  product: {
    name: string;
    packLabel: string;
    unitsPerPack: string;
    packUnit: string;
    unitPriceCents: number;
  } | null;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    category: string;
    costPerUnitCents: number;
    currentStockLevel: number;
  } | null;
};

export const inventoryNormalisationApi = {
  get: {
    queue(input: ScopedInput & { search?: string }): Promise<ApiResult<NormalisationQueueResponse>> {
      const params = new URLSearchParams();
      if (input.search?.trim()) params.set("search", input.search.trim());
      const qs = params.toString();
      return apiFetch<NormalisationQueueResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/queue${qs ? `?${qs}` : ""}`,
      );
    },
    mapping(
      input: ScopedInput & { rawItemId: string },
    ): Promise<ApiResult<NormalisationMappingResponse>> {
      return apiFetch<NormalisationMappingResponse>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/${input.rawItemId}/mapping`,
      );
    },
  },
  post: {
    suggest(
      input: ScopedInput & { rawItemId: string; regenerate?: boolean },
    ): Promise<ApiResult<NormalisationSuggestion>> {
      return apiFetch<NormalisationSuggestion>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/suggest`,
        {
          method: "POST",
          body: JSON.stringify({
            rawItemId: input.rawItemId,
            regenerate: input.regenerate ?? false,
          }),
        },
      );
    },
    commit(
      input: ScopedInput & { payload: NormaliseCommitInput },
    ): Promise<ApiResult<NormaliseCommitResult>> {
      return apiFetch<NormaliseCommitResult>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/commit`,
        {
          method: "POST",
          body: JSON.stringify(input.payload),
        },
      );
    },
    skip(
      input: ScopedInput & { rawItemId: string },
    ): Promise<ApiResult<{ rawItemId: string; normalisationStatus: "skipped" }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/${input.rawItemId}/skip`,
        { method: "POST" },
      );
    },
    unskip(
      input: ScopedInput & { rawItemId: string },
    ): Promise<ApiResult<{ rawItemId: string; normalisationStatus: "pending" }>> {
      return apiFetch(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/${input.rawItemId}/unskip`,
        { method: "POST" },
      );
    },
  },
};
