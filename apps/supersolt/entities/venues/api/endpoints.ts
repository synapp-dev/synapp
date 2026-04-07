import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { AccessContextPayload } from "@/entities/organisations/api/endpoints";

export const venuesApi = {
  get: {
    accessibleVenueGroups(): Promise<ApiResult<AccessContextPayload>> {
      return apiFetch<AccessContextPayload>("/access/context");
    },
  },
};
