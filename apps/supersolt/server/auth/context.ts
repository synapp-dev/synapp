import type { AppDb } from "@/server/db/create-app-db";
import type { UserTenantRoles } from "@/server/auth/rbac";
import { getUserTenantRoles } from "@/server/auth/rbac";

export type RequestAuthContext = {
  userId: string;
  appDb: AppDb;
  tenantRoles: UserTenantRoles;
};

export async function buildRequestAuthContext(
  userId: string,
  appDb: AppDb,
): Promise<RequestAuthContext> {
  const tenantRoles = await getUserTenantRoles(appDb, userId);
  return { userId, appDb, tenantRoles };
}
