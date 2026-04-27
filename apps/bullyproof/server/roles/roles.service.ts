import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  removeRoleSchema,
  listRolesSchema,
  getRoleByIdSchema,
  getUserRolesSchema,
  type CreateRoleParams,
  type UpdateRoleParams,
  type AssignRoleParams,
  type RemoveRoleParams,
  type ListRolesParams,
  type GetRoleByIdParams,
  type GetUserRolesParams,
} from "./roles.validators";
import { rolesRepo } from "./roles.repo";
import { getUserScopedRoles } from "../auth/rbac";
import {
  assertActorCanAssignIntradarkDevRole,
  assertActorCanManageIntradarkDevTarget,
} from "../auth/intradark-dev-account-guard";
import { checkFeatureAccess, assertFeature } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";

const SCHOOL_ROLE_KEYS = ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"] as const;
import { userProfile, userRoles } from "@/server/db/schema";
import { eq, and, inArray, sql, ilike, or } from "drizzle-orm";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageRoles(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // Platform admins can always manage roles
  const scopedRoles = await getUserScopedRoles(ctx.userId);
  if (scopedRoles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  await assertFeature(ctx, "/admin/features");
}

/**
 * For school-scoped role assign/remove: allow SCHOOL_ADMIN at the given school
 * to manage only school roles (TEACHER, SCHOOL_ADMIN, SCHOOL_STAFF) at that school.
 * Call after assertCanManageRoles fails - this is the fallback for school-admin.
 */
async function assertCanManageRolesForSchool(
  ctx: AuthContext,
  schoolId: string,
  roleKey: string
): Promise<void> {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  if (!SCHOOL_ROLE_KEYS.includes(roleKey as (typeof SCHOOL_ROLE_KEYS)[number])) {
    throw new Error(
      "School admin can only manage TEACHER, SCHOOL_ADMIN, and SCHOOL_STAFF roles"
    );
  }
  const scopedRoles = await getUserScopedRoles(ctx.userId);
  const isSchoolAdminAtSchool = scopedRoles.school.some(
    (r) => r.schoolId === schoolId && r.roleKey === "SCHOOL_ADMIN"
  );
  if (!isSchoolAdminAtSchool) {
    throw new Error("Unauthorized to manage roles at this school");
  }
  const hasFeature = await checkFeatureAccess(
    ctx.userId,
    "school:manage-school-user-roles",
    schoolId
  );
  if (!hasFeature) {
    throw new Error("Unauthorized to manage roles at this school");
  }
}

async function assertCanViewRoles(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  // Any user with a platform role can view roles
  const scopedRoles = await getUserScopedRoles(ctx.userId);
  if (scopedRoles.platform.length > 0) {
    return;
  }

  // Anyone with admin_features (from feature_permissions) can view roles, e.g. for the Features admin Role tab
  const hasAdminFeatures = await checkFeatureAccess(ctx.userId, "/admin/features");
  if (hasAdminFeatures) {
    return;
  }

  if (scopedRoles.school.some((role) => role.roleKey === "SCHOOL_ADMIN")) {
    return;
  }

  throw new Error("Unauthorized to view roles");
}

export const rolesService = {
  async listRoles(ctx: AuthContext, query: unknown) {
    const params: ListRolesParams = listRolesSchema.parse(query);
    await assertCanViewRoles(ctx);

    if (params.scope) {
      return await rolesRepo.getByScope(params.scope);
    }

    return await rolesRepo.getAll();
  },

  async getRoleById(ctx: AuthContext, params: unknown) {
    const { id } = getRoleByIdSchema.parse(params);
    await assertCanViewRoles(ctx);

    const role = await rolesRepo.getById(id);
    return role[0] ?? null;
  },

  async getUserRoles(ctx: AuthContext, params: unknown) {
    const { userId } = getUserRolesSchema.parse(params);
    await assertCanViewRoles(ctx);

    return await rolesRepo.getUserRoles(userId);
  },

  async createRole(ctx: AuthContext, params: unknown) {
    const data: CreateRoleParams = createRoleSchema.parse(params);
    await assertCanManageRoles(ctx);

    const newRole = await rolesRepo.create(data);
    return newRole[0];
  },

  async updateRole(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateRoleParams = updateRoleSchema.parse(params);
    await assertCanManageRoles(ctx);

    const updatedRole = await rolesRepo.update(id, data);
    return updatedRole[0];
  },

  async deleteRole(ctx: AuthContext, id: string) {
    await assertCanManageRoles(ctx);

    await rolesRepo.delete(id);
    return { success: true };
  },

  async assignRole(ctx: AuthContext, params: unknown, tx?: typeof db) {
    const data: AssignRoleParams = assignRoleSchema.parse(params);

    const [roleRow] = await rolesRepo.getById(data.roleId);
    if (!roleRow?.key) {
      throw new Error("Role not found");
    }

    try {
      await assertCanManageRoles(ctx);
    } catch {
      if (data.schoolId) {
        await assertCanManageRolesForSchool(
          ctx,
          data.schoolId,
          roleRow.key
        );
      } else {
        throw new Error("Unauthorized");
      }
    }

    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }
    await assertActorCanAssignIntradarkDevRole(ctx.userId, roleRow.key);
    await assertActorCanManageIntradarkDevTarget(ctx.userId, data.userId);

    const assignment = await rolesRepo.assignRole(data, tx);
    return assignment[0];
  },

  async removeRole(ctx: AuthContext, params: unknown, tx?: typeof db) {
    const data: RemoveRoleParams = removeRoleSchema.parse(params);

    const [roleRow] = await rolesRepo.getById(data.roleId);
    if (!roleRow?.key) {
      throw new Error("Role not found");
    }

    try {
      await assertCanManageRoles(ctx);
    } catch {
      if (data.schoolId) {
        await assertCanManageRolesForSchool(
          ctx,
          data.schoolId,
          roleRow.key
        );
      } else {
        throw new Error("Unauthorized");
      }
    }

    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }
    await assertActorCanManageIntradarkDevTarget(ctx.userId, data.userId);

    await rolesRepo.removeRole(data.userId, data.roleId, data.schoolId, tx);
    return { success: true };
  },

  async getUsersByRole(ctx: AuthContext, roleId: string, schoolId?: string) {
    await assertCanViewRoles(ctx);

    return await rolesRepo.getUsersByRole(roleId, schoolId);
  },

  async bulkAssignOrRemoveRoles(
    ctx: AuthContext,
    params: {
      schoolId: string;
      emails: string[];
      roleIds: string[];
      action: "assign" | "remove";
    }
  ) {
    await assertCanManageRoles(ctx);

    const results: Array<{
      email: string;
      success: boolean;
      message: string;
      skipped?: boolean;
    }> = [];

    // Normalize emails (lowercase, trim)
    const normalizedEmails = params.emails.map((email) =>
      email.trim().toLowerCase()
    );

    // Fetch users by email from userProfile
    // Build OR conditions for email matching (case-insensitive)
    const emailConditions = normalizedEmails.map((email) =>
      ilike(userProfile.email, email)
    );
    
    const users = emailConditions.length > 0
      ? await db
          .select({
            id: userProfile.id,
            email: userProfile.email,
          })
          .from(userProfile)
          .where(or(...emailConditions))
      : [];

    // Create a map of email -> user id
    const emailToUserId = new Map<string, string>();
    users.forEach((user) => {
      if (user.email) {
        emailToUserId.set(user.email.toLowerCase(), user.id);
      }
    });

    // Process each email
    for (const email of normalizedEmails) {
      const userId = emailToUserId.get(email);

      // Check if email exists in user_profile
      if (!userId) {
        results.push({
          email,
          success: false,
          message: "Email not found in database",
        });
        continue;
      }

      if (!ctx.userId) {
        results.push({
          email,
          success: false,
          message: "Unauthorized",
        });
        continue;
      }

      try {
        await assertActorCanManageIntradarkDevTarget(ctx.userId, userId);
      } catch (e: any) {
        results.push({
          email,
          success: false,
          message: e.message ?? "Forbidden",
        });
        continue;
      }

      // Process each role for this user
      let userSuccess = true;
      const roleMessages: string[] = [];
      let skippedCount = 0;

      for (const roleId of params.roleIds) {
        try {
          if (params.action === "assign") {
            // Check if role already exists
            const existingRole = await rolesRepo.hasRole(
              userId,
              roleId,
              params.schoolId
            );

            if (existingRole.length > 0) {
              skippedCount++;
              roleMessages.push("Role already assigned");
              continue;
            }

            const [roleRowForIntradev] = await rolesRepo.getById(roleId);
            await assertActorCanAssignIntradarkDevRole(
              ctx.userId,
              roleRowForIntradev?.key
            );

            // Assign role
            await rolesRepo.assignRole(
              {
                userId,
                roleId,
                schoolId: params.schoolId,
                roleScope: "school",
              },
              undefined
            );
            roleMessages.push("Role assigned successfully");
          } else {
            // Check if role exists
            const existingRole = await rolesRepo.hasRole(
              userId,
              roleId,
              params.schoolId
            );

            if (existingRole.length === 0) {
              skippedCount++;
              roleMessages.push("Role not assigned");
              continue;
            }

            // Remove role
            await rolesRepo.removeRole(
              userId,
              roleId,
              params.schoolId,
              undefined
            );
            roleMessages.push("Role removed successfully");
          }
        } catch (error: any) {
          userSuccess = false;
          roleMessages.push(
            error.message || "Failed to process role operation"
          );
        }
      }

      // Add result for this user
      results.push({
        email,
        success: userSuccess,
        skipped: skippedCount === params.roleIds.length,
        message:
          roleMessages.length > 0
            ? roleMessages.join("; ")
            : params.action === "assign"
              ? "Roles assigned successfully"
              : "Roles removed successfully",
      });
    }

    // Calculate summary
    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.success && !r.skipped).length,
      failed: results.filter((r) => !r.success).length,
      skipped: results.filter((r) => r.skipped).length,
    };

    return {
      success: summary.failed === 0,
      results,
      summary,
    };
  },
};
