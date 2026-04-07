import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type AccessibleVenue = {
  id: string;
  name: string;
  slug: string;
  suburb: string | null;
  state: string | null;
  venueType: string;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
};

export type AccessibleOrganisation = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  roleSlug: string;
  roleDisplayName: string;
  grantsOrgAdmin: boolean;
  venues: AccessibleVenue[];
};

export type AccessContextPayload = {
  organisations: AccessibleOrganisation[];
};

export const organisationsApi = {
  get: {
    accessContext(): Promise<ApiResult<AccessContextPayload>> {
      return apiFetch<AccessContextPayload>("/access/context");
    },
  },
};
