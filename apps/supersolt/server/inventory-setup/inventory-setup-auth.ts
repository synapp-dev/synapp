import type { UserTenantRoles } from "@/server/auth/rbac";
import { AuthError } from "@/server/auth/errors";
import { isOrganisationAdminForOrg } from "@/server/auth/capabilities";

/** Matches Settings → Inventory Setup UI gate (owner, org admin, venue manager). */
export function canManageInventorySetup(
  roles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): boolean {
  const org = roles.organisations.find((o) => o.organisationId === args.organisationId);
  if (!org) return false;
  if (isOrganisationAdminForOrg(roles, args.organisationId)) return true;
  if (org.roleSlug === "owner") return true;
  const venue = org.venues.find((v) => v.venueId === args.venueId);
  return venue?.roleSlug === "manager";
}

export function assertInventorySetupWriteAccess(
  roles: UserTenantRoles,
  args: { organisationId: string; venueId: string },
): void {
  if (!canManageInventorySetup(roles, args)) {
    throw new AuthError(403, "Forbidden");
  }
}
