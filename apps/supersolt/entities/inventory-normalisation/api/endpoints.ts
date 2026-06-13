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
  },
  post: {
    suggest(
      input: ScopedInput & { rawItemId: string },
    ): Promise<ApiResult<NormalisationSuggestion>> {
      return apiFetch<NormalisationSuggestion>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/inventory-setup/normalise/suggest`,
        {
          method: "POST",
          body: JSON.stringify({ rawItemId: input.rawItemId }),
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
