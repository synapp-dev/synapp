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

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageRoles(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  
  // Only platform admins can manage roles
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }

  throw new Error("Unauthorized to manage roles");
}

async function assertCanViewRoles(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  
  // Platform admins and school admins can view roles
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }

  if (roles.school.some(role => role.roleKey === "SCHOOL_ADMIN")) {
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

  async assignRole(ctx: AuthContext, params: unknown) {
    const data: AssignRoleParams = assignRoleSchema.parse(params);
    await assertCanManageRoles(ctx);

    const assignment = await rolesRepo.assignRole(data);
    return assignment[0];
  },

  async removeRole(ctx: AuthContext, params: unknown) {
    const data: RemoveRoleParams = removeRoleSchema.parse(params);
    await assertCanManageRoles(ctx);

    await rolesRepo.removeRole(data.userId, data.roleId, data.schoolId);
    return { success: true };
  },

  async getUsersByRole(ctx: AuthContext, roleId: string, schoolId?: string) {
    await assertCanViewRoles(ctx);
    
    return await rolesRepo.getUsersByRole(roleId, schoolId);
  },
};
