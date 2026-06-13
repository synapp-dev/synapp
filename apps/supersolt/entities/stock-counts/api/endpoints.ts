import type {
  CreateStockCountInput,
  PatchStockCountInput,
  StockCountActionInput,
  StockCountDetailDto,
  StockCountListResponse,
} from "@/server/stock-counts/stock-counts.types";
import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export const stockCountsApi = {
  get: {
    list(input: {
      organisationSlug: string;
      venueSlug: string;
      status?: string;
    }): Promise<ApiResult<StockCountListResponse>> {
      const params = new URLSearchParams();
      if (input.status) params.set("status", input.status);
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts`;
      return apiFetch<StockCountListResponse>(qs ? `${path}?${qs}` : path);
    },
    detail(input: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
    }): Promise<ApiResult<StockCountDetailDto>> {
      return apiFetch<StockCountDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts/${input.countId}`,
      );
    },
  },
  post: {
    create(input: {
      organisationSlug: string;
      venueSlug: string;
      body: CreateStockCountInput;
    }): Promise<ApiResult<StockCountDetailDto>> {
      return apiFetch<StockCountDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts`,
        { method: "POST", body: JSON.stringify(input.body) },
      );
    },
    action(input: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      action: string;
      body?: StockCountActionInput;
    }): Promise<ApiResult<StockCountDetailDto>> {
      return apiFetch<StockCountDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts/${input.countId}/${input.action}`,
        {
          method: "POST",
          body: JSON.stringify(input.body ?? {}),
        },
      );
    },
    entryPhoto(input: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      entryId: string;
      file: File;
    }): Promise<ApiResult<StockCountDetailDto>> {
      const formData = new FormData();
      formData.set("file", input.file);
      return apiFetch<StockCountDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts/${input.countId}/entries/${input.entryId}/photo`,
        { method: "POST", body: formData },
      );
    },
  },
  patch: {
    detail(input: {
      organisationSlug: string;
      venueSlug: string;
      countId: string;
      body: PatchStockCountInput;
    }): Promise<ApiResult<StockCountDetailDto>> {
      return apiFetch<StockCountDetailDto>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/stock-counts/${input.countId}`,
        { method: "PATCH", body: JSON.stringify(input.body) },
      );
    },
  },
};
