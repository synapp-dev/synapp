import type { UserTenantRoles } from "@/server/auth/rbac";
import {
  isOrganisationAdminForOrg,
  OPERATOR_DASHBOARD_ROLE_SLUGS,
} from "@/server/auth/capabilities";

export function canViewEmployeeSensitive(
  roles: UserTenantRoles,
  organisationId: string,
  subjectProfileId: string,
  viewerProfileId: string,
): boolean {
  if (viewerProfileId === subjectProfileId) return true;
  return isOrganisationAdminForOrg(roles, organisationId);
}

export function canManagePeople(
  roles: UserTenantRoles,
  organisationId: string,
): boolean {
  if (isOrganisationAdminForOrg(roles, organisationId)) return true;
  const org = roles.organisations.find((o) => o.organisationId === organisationId);
  if (!org) return false;
  if (OPERATOR_DASHBOARD_ROLE_SLUGS.has(org.roleSlug)) return true;
  return org.venues.some((v) => OPERATOR_DASHBOARD_ROLE_SLUGS.has(v.roleSlug));
}

export function requiresAwardOverrideReason(args: {
  newRateCents: number;
  minimumRateCents: number | null;
  overrideReason?: string | null;
}): boolean {
  if (args.minimumRateCents == null) return false;
  if (args.newRateCents >= args.minimumRateCents) return false;
  return !args.overrideReason?.trim();
}

const TAX_TREATMENT_RE = /^[A-Z0-9]{6}$/;

export function isValidTaxTreatmentCode(code: string | null | undefined): boolean {
  if (!code?.trim()) return false;
  return TAX_TREATMENT_RE.test(code.trim().toUpperCase());
}
