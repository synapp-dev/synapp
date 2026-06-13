import type { UserTenantRoles } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { OPERATOR_DASHBOARD_ROLE_SLUGS } from "@/server/auth/capabilities";
import { isOrganisationAdminForOrg } from "@/server/auth/capabilities";

export function isTimesheetOperator(
  tenantRoles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): boolean {
  if (isOrganisationAdminForOrg(tenantRoles, args.organisationId)) {
    return true;
  }
  const org = tenantRoles.organisations.find((o) => o.organisationId === args.organisationId);
  const venue = org?.venues.find((v) => v.venueId === args.venueId);
  return venue != null && OPERATOR_DASHBOARD_ROLE_SLUGS.has(venue.roleSlug);
}

export function assertTimesheetOperator(
  tenantRoles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): void {
  if (!isTimesheetOperator(tenantRoles, args)) {
    throw new AuthError(403, "Forbidden");
  }
}

export function canApproveTimesheet(
  tenantRoles: UserTenantRoles,
  args: { organisationId: string; venueId: string; requiresOwner: boolean },
): boolean {
  if (args.requiresOwner) {
    return isOrganisationAdminForOrg(tenantRoles, args.organisationId);
  }
  return isTimesheetOperator(tenantRoles, args);
}
