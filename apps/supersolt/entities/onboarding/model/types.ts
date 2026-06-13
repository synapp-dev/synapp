export type OrganisationSetupProgress = {
  xeroSkipped?: boolean;
  teamSkipped?: boolean;
  squareConnectedAt?: string;
};

export type OnboardingOrganisationDto = {
  id: string;
  name: string;
  slug: string;
  abn: string | null;
  isGstRegistered: boolean;
  setupProgress?: OrganisationSetupProgress;
};

export type OnboardingVenueDto = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  dataStartsFrom: string | null;
};

export type OnboardingStateResult =
  | { completed: true }
  | {
      completed: false;
      organisation: OnboardingOrganisationDto | null;
      venues: OnboardingVenueDto[];
      userOrganisationId: string | null;
      /** True when primary (first) venue has Square tokens. */
      squareConnected: boolean;
      /** Route suffixes (after /{org}/{venue}/) reachable before finalize. */
      unlockedRouteSuffixes: string[];
      organisationSlug: string | null;
      primaryVenueSlug: string | null;
    };
