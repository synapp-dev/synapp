import type { ScopedContext } from "@/entities/access/scoped-navigation-context";
import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";

export function venueScopeFromAccess(
  access: AccessContextPayloadDto,
  preferred: ScopedContext | null,
): ScopedContext | null {
  if (preferred) {
    const org = access.organisations.find(
      (candidate) => candidate.slug === preferred.organisationSlug,
    );
    const venue = org?.venues.find(
      (candidate) => candidate.slug === preferred.venueSlug,
    );
    if (org && venue) {
      return preferred;
    }
  }

  const org = access.organisations[0];
  if (!org) {
    return null;
  }

  const venue = org.venues[0];
  if (!venue) {
    return null;
  }

  return {
    organisationSlug: org.slug,
    venueSlug: venue.slug,
  };
}
