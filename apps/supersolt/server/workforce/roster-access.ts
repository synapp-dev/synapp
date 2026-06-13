import type { UserTenantRoles } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { OPERATOR_DASHBOARD_ROLE_SLUGS } from "@/server/auth/capabilities";

/** Venue managers and above may edit rosters. */
export function assertVenueRosterEditor(
  tenantRoles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): void {
  const org = tenantRoles.organisations.find(
    (o) => o.organisationId === args.organisationId,
  );
  if (!org) {
    throw new AuthError(403, "Forbidden");
  }

  if (org.grantsOrgAdmin) {
    return;
  }

  const venue = org.venues.find((v) => v.venueId === args.venueId);
  if (!venue) {
    throw new AuthError(403, "Forbidden");
  }

  if (!OPERATOR_DASHBOARD_ROLE_SLUGS.has(venue.roleSlug)) {
    throw new AuthError(403, "Forbidden");
  }
}
