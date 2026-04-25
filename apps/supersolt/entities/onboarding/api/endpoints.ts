import { apiFetch, type ApiResult } from "@/lib/api/fetcher.client";
import type {
  OnboardingOrganisationDto,
  OnboardingStateResult,
  OnboardingVenueDto,
} from "@/entities/onboarding/model/types";

export type { OnboardingOrganisationDto, OnboardingVenueDto, OnboardingStateResult };

export const onboardingApi = {
  getState(): Promise<ApiResult<OnboardingStateResult>> {
    return apiFetch<OnboardingStateResult>("/onboarding/state");
  },
  postOrganisation(body: {
    name: string;
    abn?: string | null;
    isGstRegistered?: boolean;
    /** Existing onboarding org to update; omit on first save. */
    organisationId?: string | null;
  }): Promise<ApiResult<{ organisation: OnboardingOrganisationDto }>> {
    return apiFetch<{ organisation: OnboardingOrganisationDto }>(
      "/onboarding/organisation",
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  postVenue(body: {
    organisationId: string;
    name: string;
    addressLine1?: string | null;
    timezone?: string;
  }): Promise<ApiResult<{ venue: OnboardingVenueDto }>> {
    return apiFetch<{ venue: OnboardingVenueDto }>("/onboarding/venue", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  postFinalize(): Promise<ApiResult<{ ok: boolean }>> {
    return apiFetch<{ ok: boolean }>("/onboarding/finalize", { method: "POST" });
  },
  postInvite(body: {
    email: string;
    roleSlug?: string;
  }): Promise<
    ApiResult<{
      invited: boolean;
      skipped?: boolean;
      reason?: string;
      userId?: string | null;
    }>
  > {
    return apiFetch("/onboarding/invite", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
