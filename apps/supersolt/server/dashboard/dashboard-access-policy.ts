import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";

/** Roles that may use the operator dashboard (excludes `crew` — maps to Notion “Staff”). */
const DASHBOARD_ROLE_SLUGS = new Set([
  "owner",
  "admin",
  "manager",
  "supervisor",
]);

export function userCanAccessDashboard(
  access: AccessContextPayloadDto | null | undefined,
): boolean {
  if (!access?.organisations?.length) {
    return false;
  }
  for (const org of access.organisations) {
    if (DASHBOARD_ROLE_SLUGS.has(org.roleSlug)) {
      return true;
    }
    for (const venue of org.venues) {
      if (DASHBOARD_ROLE_SLUGS.has(venue.roleSlug)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Silent redirect target for crew-only users (Notion: Staff lands on roster).
 * Picks the first organisation (sorted by name in payload) and first venue in that org.
 */
export function getStaffDashboardRedirectPath(
  access: AccessContextPayloadDto,
): string {
  if (access.organisations.length === 0) {
    return "/setup";
  }
  const org = access.organisations[0]!;
  const venue = org.venues[0];
  if (!venue) {
    return "/setup";
  }
  return `/${org.slug}/${venue.slug}/workforce/roster`;
}
