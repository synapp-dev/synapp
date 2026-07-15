import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  CreateWasteEntryInput,
  WasteListResponse,
} from "@/entities/waste/model/types";

export const wasteApi = {
  get: {
    list(input: {
      organisationSlug: string;
      venueSlug: string;
      fromIso?: string;
      toIso?: string;
    }): Promise<ApiResult<WasteListResponse>> {
      const params = new URLSearchParams();
      if (input.fromIso) params.set("from", input.fromIso);
      if (input.toIso) params.set("to", input.toIso);
      const qs = params.toString();
      const path = `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/waste-entries`;
      return apiFetch<WasteListResponse>(qs ? `${path}?${qs}` : path);
    },
  },
  post: {
    create(input: {
      organisationSlug: string;
      venueSlug: string;
      body: CreateWasteEntryInput;
    }): Promise<ApiResult<{ id: string }>> {
      return apiFetch<{ id: string }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/waste-entries`,
        { method: "POST", body: JSON.stringify(input.body) },
      );
    },
    createBulk(input: {
      organisationSlug: string;
      venueSlug: string;
      entries: CreateWasteEntryInput[];
    }): Promise<ApiResult<{ ids: string[] }>> {
      return apiFetch<{ ids: string[] }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/waste-entries`,
        { method: "POST", body: JSON.stringify({ entries: input.entries }) },
      );
    },
  },
  delete: {
    entry(input: {
      organisationSlug: string;
      venueSlug: string;
      entryId: string;
    }): Promise<ApiResult<{ deleted: true }>> {
      return apiFetch<{ deleted: true }>(
        `/organisations/${input.organisationSlug}/venues/${input.venueSlug}/waste-entries/${input.entryId}`,
        { method: "DELETE" },
      );
    },
  },
};
