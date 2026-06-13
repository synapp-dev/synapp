import type { AccessContextPayloadDto } from "@/server/access/load-access-context-for-user";
import {
  canAccessOperatorDashboard,
  OPERATOR_DASHBOARD_ROLE_SLUGS,
} from "@/server/auth/capabilities";

export { OPERATOR_DASHBOARD_ROLE_SLUGS };

export function userCanAccessDashboard(
  access: AccessContextPayloadDto | null | undefined,
): boolean {
  if (!access?.organisations?.length) {
    return false;
  }
  for (const org of access.organisations) {
    if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(org.roleSlug)) {
      return true;
    }
    for (const venue of org.venues) {
      if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(venue.roleSlug)) {
        return true;
      }
    }
  }
  return false;
}

/** Re-export for callers that already have tenant roles loaded. */
export { canAccessOperatorDashboard };

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
