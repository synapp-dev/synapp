import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";

export type VenueSquareConnectionSummaryDto = {
  connected: boolean;
  merchantId: string | null;
  environment: string | null;
  squareLocationId: string | null;
  locationConfigured: boolean;
  updatedAt: string | null;
};

export type SquareLocationOptionDto = {
  id: string;
  name: string;
  status: string;
};

export type SquareLocationsResponseDto = {
  locations: SquareLocationOptionDto[];
  currentLocationId: string | null;
};

export const squareApi = {
  getVenueConnection(
    organisationSlug: string,
    venueSlug: string,
  ): Promise<ApiResult<VenueSquareConnectionSummaryDto>> {
    return apiFetch<VenueSquareConnectionSummaryDto>(
      `/organisations/${encodeURIComponent(organisationSlug)}/venues/${encodeURIComponent(venueSlug)}/square/connection`,
    );
  },

  getLocations(
    organisationSlug: string,
    venueSlug: string,
  ): Promise<ApiResult<SquareLocationsResponseDto>> {
    return apiFetch<SquareLocationsResponseDto>(
      `/organisations/${encodeURIComponent(organisationSlug)}/venues/${encodeURIComponent(venueSlug)}/square/locations`,
    );
  },

  setLocation(args: {
    organisationSlug: string;
    venueSlug: string;
    locationId: string;
  }): Promise<ApiResult<{ locationId: string }>> {
    return apiFetch<{ locationId: string }>(
      `/organisations/${encodeURIComponent(args.organisationSlug)}/venues/${encodeURIComponent(args.venueSlug)}/square/location`,
      {
        method: "PATCH",
        body: JSON.stringify({ locationId: args.locationId }),
      },
    );
  },
};
