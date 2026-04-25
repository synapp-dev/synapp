import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type { AccessContextPayload } from "@/entities/organisations/api/endpoints";
import type { CreatedOrganisationVenueDto } from "@/entities/venues/model/types";

export type CreateOrganisationVenueBody = {
  name: string;
  addressLine1?: string | null;
  timezone?: string;
};

export const venuesApi = {
  get: {
    accessibleVenueGroups(): Promise<ApiResult<AccessContextPayload>> {
      return apiFetch<AccessContextPayload>("/access/context");
    },
  },
  post: {
    createForOrganisation(
      organisationSlug: string,
      body: CreateOrganisationVenueBody
    ): Promise<ApiResult<{ venue: CreatedOrganisationVenueDto }>> {
      const path = `/organisations/${encodeURIComponent(organisationSlug)}/venues`;
      return apiFetch<{ venue: CreatedOrganisationVenueDto }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  },
};
