import { createServerAdminClient } from "@/utils/supabase/admin";
import { checkFeatureAccess } from "@/server/features/features.service";
import { canManageSchoolUsers } from "@/server/lib/can-manage-school-users";
import { rolesRepo } from "@/server/roles/roles.repo";
import {
  findAuthUserIdByEmail,
  getProfileByEmail,
} from "@/server/user/resolve-auth-user-by-email";
import {
  userLookupQuerySchema,
  type UserLookupResponse,
} from "@/server/user/user-lookup.validators";

const SCHOOL_ROLE_KEYS_FOR_PREFILL = [
  "SCHOOL_STAFF",
  "TEACHER",
  "SCHOOL_ADMIN",
] as const;

export const userLookupService = {
  async lookupByEmail(
    actorUserId: string,
    params: unknown
  ): Promise<UserLookupResponse> {
    const { email, schoolId } = userLookupQuerySchema.parse(params);

    const hasPlatformAdmin = await checkFeatureAccess(
      actorUserId,
      "/admin/users"
    );

    if (!hasPlatformAdmin) {
      if (!schoolId) {
        throw new Error("Unauthorized");
      }
      const canManage = await canManageSchoolUsers(actorUserId, schoolId);
      if (!canManage) {
        throw new Error("Unauthorized");
      }
    }

    const profile = await getProfileByEmail(email);
    let userId = profile?.id;

    if (!userId) {
      const adminClient = await createServerAdminClient();
      userId =
        (await findAuthUserIdByEmail(adminClient.auth.admin, email)) ??
        undefined;
    }

    if (!userId) {
      return { exists: false };
    }

    const response: UserLookupResponse = {
      exists: true,
      userId,
      firstName: profile?.firstName ?? null,
      lastName: profile?.lastName ?? null,
    };

    if (schoolId) {
      const userRoles = await rolesRepo.getUserRoles(userId);
      const schoolRoleKeys = userRoles
        .filter(
          (ur) =>
            ur.userRole.schoolId === schoolId &&
            ur.role.key &&
            SCHOOL_ROLE_KEYS_FOR_PREFILL.includes(
              ur.role.key as (typeof SCHOOL_ROLE_KEYS_FOR_PREFILL)[number]
            )
        )
        .map((ur) => ur.role.key!)
        .filter(Boolean);

      response.schoolRoleKeys = [...new Set(schoolRoleKeys)];
    }

    return response;
  },
};
