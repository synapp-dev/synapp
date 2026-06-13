import type { AccessibleOrganisation } from "@/entities/organisations/api/endpoints";

export type ScopedSettingsAccess = {
  canSeeSettingsNav: boolean;
  canSeePermissions: boolean;
  canSeeOrganisation: boolean;
  canSeeVenue: boolean;
  canSeeAwardRates: boolean;
  /** First tab segment in display order: permissions → organisation → venue. */
  firstAllowedSegment: "permissions" | "organisation" | "venue" | null;
};

const EMPTY: ScopedSettingsAccess = {
  canSeeSettingsNav: false,
  canSeePermissions: false,
  canSeeOrganisation: false,
  canSeeVenue: false,
  canSeeAwardRates: false,
  firstAllowedSegment: null,
};

function findScopedVenue(
  organisations: AccessibleOrganisation[],
  organisationSlug: string,
  venueSlug: string,
) {
  const org = organisations.find((o) => o.slug === organisationSlug);
  if (!org) {
    return null;
  }
  const venue = org.venues.find((v) => v.slug === venueSlug);
  if (!venue) {
    return null;
  }
  return { org, venue };
}

export function getScopedSettingsAccess(
  organisations: AccessibleOrganisation[],
  organisationSlug: string,
  venueSlug: string,
): ScopedSettingsAccess {
  if (!organisationSlug || !venueSlug) {
    return EMPTY;
  }

  const ctx = findScopedVenue(organisations, organisationSlug, venueSlug);
  if (!ctx) {
    return EMPTY;
  }

  const { org, venue } = ctx;
  const canSeePermissions = org.roleSlug === "owner";
  const canSeeOrganisation = org.roleSlug === "owner";
  const canSeeAwardRates = org.grantsOrgAdmin;
  const canSeeVenue = org.grantsOrgAdmin || venue.roleSlug === "manager";
  const canSeeSettingsNav =
    org.grantsOrgAdmin || org.roleSlug === "owner" || venue.roleSlug === "manager";

  const order = ["permissions", "organisation", "venue"] as const;
  const flags = {
    permissions: canSeePermissions,
    organisation: canSeeOrganisation,
    venue: canSeeVenue,
  } as const;

  let firstAllowedSegment: ScopedSettingsAccess["firstAllowedSegment"] = null;
  for (const seg of order) {
    if (flags[seg]) {
      firstAllowedSegment = seg;
      break;
    }
  }

  return {
    canSeeSettingsNav,
    canSeePermissions,
    canSeeOrganisation,
    canSeeVenue,
    canSeeAwardRates,
    firstAllowedSegment,
  };
}

export function buildSettingsTabHref(
  organisationSlug: string,
  venueSlug: string,
  segment: "permissions" | "organisation" | "venue",
): string {
  return `/${organisationSlug}/${venueSlug}/settings/${segment}`;
}
