import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  ReadinessCompactDto,
  ReadinessPatchBody,
  ReadinessPayloadDto,
} from "@/entities/readiness/model/types";

function readinessPath(organisationSlug: string, venueSlug: string, view?: "compact") {
  const suffix = view === "compact" ? "?view=compact" : "";
  return `/organisations/${organisationSlug}/venues/${venueSlug}/readiness${suffix}`;
}

export const readinessApi = {
  getVenueReadiness(
    organisationSlug: string,
    venueSlug: string,
  ): Promise<ApiResult<ReadinessPayloadDto>> {
    return apiFetch<ReadinessPayloadDto>(
      readinessPath(organisationSlug, venueSlug),
    );
  },

  getVenueReadinessCompact(
    organisationSlug: string,
    venueSlug: string,
  ): Promise<ApiResult<ReadinessCompactDto>> {
    return apiFetch<ReadinessCompactDto>(
      readinessPath(organisationSlug, venueSlug, "compact"),
    );
  },

  patchVenueReadiness(
    organisationSlug: string,
    venueSlug: string,
    body: ReadinessPatchBody,
  ): Promise<ApiResult<{ ok: true }>> {
    return apiFetch<{ ok: true }>(readinessPath(organisationSlug, venueSlug), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
};
