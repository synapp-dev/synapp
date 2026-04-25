import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { onboardingApi } from "@/entities/onboarding/api/endpoints";
import type {
  OnboardingOrganisationDto,
  OnboardingStateResult,
  OnboardingVenueDto,
} from "@/entities/onboarding/model/types";
import { onboardingKeys } from "@/entities/onboarding/model/keys";

/** First step that still needs work, or next section after required gates (1–3). */
export function inferResumeStep(
  organisation: OnboardingOrganisationDto | null,
  venues: OnboardingVenueDto[],
): number {
  if (!organisation) return 1;
  if (venues.length === 0) return 2;
  return 3;
}

async function unwrapState(): Promise<OnboardingStateResult> {
  const res = await onboardingApi.getState();
  if (res.error) {
    throw new Error(res.error.message);
  }
  if (!res.data) {
    throw new Error("Missing onboarding state");
  }
  return res.data;
}

export function useOnboardingStateQuery() {
  return useQuery({
    queryKey: onboardingKeys.state(),
    queryFn: unwrapState,
    staleTime: 30_000,
  });
}

export function useSaveOnboardingOrganisationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      name: string;
      abn?: string | null;
      isGstRegistered?: boolean;
      organisationId?: string | null;
    }) => {
      const res = await onboardingApi.postOrganisation(body);
      if (res.error) {
        throw new Error(res.error.message);
      }
      if (!res.data) {
        throw new Error("Missing organisation payload");
      }
      return res.data.organisation;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.state() });
    },
  });
}

export function useSaveOnboardingVenueMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      organisationId: string;
      name: string;
      addressLine1?: string | null;
      timezone?: string;
    }) => {
      const res = await onboardingApi.postVenue(body);
      if (res.error) {
        throw new Error(res.error.message);
      }
      if (!res.data) {
        throw new Error("Missing venue payload");
      }
      return res.data.venue;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.state() });
    },
  });
}

export function useFinalizeOnboardingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await onboardingApi.postFinalize();
      if (res.error) {
        throw new Error(res.error.message);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: onboardingKeys.state() });
    },
  });
}

export function useInviteOnboardingMutation() {
  return useMutation({
    mutationFn: async (body: { email: string; roleSlug?: string }) => {
      const res = await onboardingApi.postInvite(body);
      if (res.error) {
        throw new Error(res.error.message);
      }
      return res.data;
    },
  });
}
