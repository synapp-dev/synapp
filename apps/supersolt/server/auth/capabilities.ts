import type { UserTenantRoles } from "@/server/auth/rbac";

/** Roles that may use the operator dashboard (excludes `crew`). */
export const OPERATOR_DASHBOARD_ROLE_SLUGS = new Set([
  "owner",
  "admin",
  "manager",
  "supervisor",
]);

export function canAccessOperatorDashboard(roles: UserTenantRoles): boolean {
  for (const org of roles.organisations) {
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

export function isOrganisationAdminForOrg(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  const org = roles.organisations.find((o) => o.organisationId === organisationId);
  return org?.grantsOrgAdmin === true;
}

export function canManageIntegrations(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canRunForecastSync(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canPreparePayrollRun(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  if (isOrganisationAdminForOrg(roles, organisationId)) {
    return true;
  }
  const org = roles.organisations.find((o) => o.organisationId === organisationId);
  if (!org) return false;
  if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(org.roleSlug)) return true;
  return org.venues.some((v) => OPERATOR_DASHBOARD_ROLE_SLUGS.has(v.roleSlug));
}

export function canApprovePayrollRun(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canExecutePayrollPayment(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canViewFdvPayrollLines(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canViewAwardRates(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canManageAwardConfig(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canApplyAwrUplift(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return isOrganisationAdminForOrg(roles, organisationId);
}

function roleInOrg(
  roles: UserTenantRoles,
  organisationId: string,
): { orgRoleSlug: string; venueRoleSlugs: string[] } | null {
  const org = roles.organisations.find((o) => o.organisationId === organisationId);
  if (!org) return null;
  return {
    orgRoleSlug: org.roleSlug,
    venueRoleSlugs: org.venues.map((v) => v.roleSlug),
  };
}

function hasOperatorRoleInOrg(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  const info = roleInOrg(roles, organisationId);
  if (!info) return false;
  if (isOrganisationAdminForOrg(roles, organisationId)) return true;
  if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(info.orgRoleSlug)) return true;
  return info.venueRoleSlugs.some((slug) => OPERATOR_DASHBOARD_ROLE_SLUGS.has(slug));
}

/** Venue Manager+ — create counts and schedules. */
export function canCreateStockCount(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return hasOperatorRoleInOrg(roles, organisationId);
}

/** Assignee or Venue Manager+ — enter count quantities. */
export function canRunStockCount(
  roles: UserTenantRoles,
  organisationId: string,
  args: { assigneeUserId: string | null; userId: string },
): boolean {
  if (args.assigneeUserId && args.assigneeUserId === args.userId) {
    return true;
  }
  return hasOperatorRoleInOrg(roles, organisationId);
}

/** Owner / Area Manager / Venue Manager — approve counts. */
export function canApproveStockCount(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  return hasOperatorRoleInOrg(roles, organisationId);
}

/** Owner only — large variance threshold approval. */
export function canApproveLargeVarianceStockCount(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  if (isOrganisationAdminForOrg(roles, organisationId)) return true;
  const info = roleInOrg(roles, organisationId);
  return info?.orgRoleSlug === "owner";
}

/**
 * Redirect path for crew-only users (first org + venue roster).
 */
export function getStaffDashboardRedirectPath(roles: UserTenantRoles): string {
  const org = roles.organisations[0];
  if (!org) {
    return "/setup";
  }
  const venue = org.venues[0];
  if (!venue) {
    return "/setup";
  }
  return `/${org.organisationSlug}/${venue.venueSlug}/workforce/roster`;
}
