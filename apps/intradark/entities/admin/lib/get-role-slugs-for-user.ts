import { getEffectiveRoleSlugsForUser } from "@/entities/rbac/lib/get-effective-role-slugs";

/** `userId` is `auth.users.id` (same as `user_profiles.user_id`). Includes template-expanded slugs. */
export async function getRoleSlugsForUser(
  userId: string,
): Promise<readonly string[]> {
  return getEffectiveRoleSlugsForUser(userId);
}
