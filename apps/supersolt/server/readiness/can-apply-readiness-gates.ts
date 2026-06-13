import { OPERATOR_DASHBOARD_ROLE_SLUGS } from "@/server/auth/capabilities";
import type { UserTenantRoles } from "@/server/auth/rbac";

export function canApplyReadinessGatesForVenue(
  roles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): boolean {
  const org = roles.organisations.find(
    (candidate) => candidate.organisationId === args.organisationId,
  );
  if (!org) {
    return false;
  }

  if (org.grantsOrgAdmin) {
    return true;
  }

  if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(org.roleSlug)) {
    return true;
  }

  const venue = org.venues.find((candidate) => candidate.venueId === args.venueId);
  if (!venue) {
    return false;
  }

  return OPERATOR_DASHBOARD_ROLE_SLUGS.has(venue.roleSlug);
}
