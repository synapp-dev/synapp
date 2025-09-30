import { getUserScopedRoles, type UserScopedRoles } from "./rbac";

export type RequestAuthContext = {
  userId: string;
  roles: UserScopedRoles;
};

export async function buildRequestAuthContext(
  userId: string
): Promise<RequestAuthContext> {
  const roles = await getUserScopedRoles(userId);
  return { userId, roles };
}
