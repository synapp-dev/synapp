export type OnboardingOrganisationDto = {
  id: string;
  name: string;
  slug: string;
  abn: string | null;
  isGstRegistered: boolean;
};

export type OnboardingVenueDto = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

export type OnboardingStateResult =
  | { completed: true }
  | {
      completed: false;
      organisation: OnboardingOrganisationDto | null;
      venues: OnboardingVenueDto[];
      userOrganisationId: string | null;
    };
