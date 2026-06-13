import type { AppDb } from "@/server/db/create-app-db";
import {
  getUserTenantRoles,
  isOrganisationAdmin,
} from "@/server/auth/rbac";

export async function userIsOrgAdmin(
  appDb: AppDb,
  userId: string,
  organisationId: string,
): Promise<boolean> {
  const tenantRoles = await getUserTenantRoles(appDb, userId);
  return isOrganisationAdmin(tenantRoles, organisationId);
}
