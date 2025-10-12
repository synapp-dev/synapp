import {
  createInviteSchema,
  updateInviteSchema,
  listInvitesSchema,
  getInviteByIdSchema,
  acceptInviteSchema,
  type CreateInviteParams,
  type UpdateInviteParams,
  type ListInvitesParams,
  type GetInviteByIdParams,
  type AcceptInviteParams,
} from "./invites.validators";
import { invitesRepo } from "./invites.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageInvites(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  
  // Platform admins can manage all invites
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }

  // School admins can manage invites for their schools
  if (schoolId && roles.school.some(role => 
    role.schoolId === schoolId && 
    role.roleKey === "SCHOOL_ADMIN"
  )) {
    return;
  }

  throw new Error("Unauthorized to manage invites");
}

async function assertCanViewInvites(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);
  
  // Platform admins can view all invites
  if (roles.platform.includes("BULLYPROOF_ADMIN")) {
    return;
  }

  // School admins can view invites for their schools
  if (schoolId && roles.school.some(role => 
    role.schoolId === schoolId && 
    role.roleKey === "SCHOOL_ADMIN"
  )) {
    return;
  }

  throw new Error("Unauthorized to view invites");
}

export const invitesService = {
  async listInvites(ctx: AuthContext, query: unknown) {
    const params: ListInvitesParams = listInvitesSchema.parse(query);
    await assertCanViewInvites(ctx, params.schoolId);

    if (params.schoolId) {
      return await invitesRepo.getBySchoolId(params.schoolId);
    }

    if (params.email) {
      return await invitesRepo.getByEmail(params.email);
    }

    // For platform admins, return all invites
    return await invitesRepo.getAll();
  },

  async getInviteById(ctx: AuthContext, params: unknown) {
    const { id } = getInviteByIdSchema.parse(params);
    
    const inviteData = await invitesRepo.getById(id);
    if (!inviteData[0]) {
      return null;
    }

    await assertCanViewInvites(ctx, inviteData[0].schoolId);
    
    return await invitesRepo.getWithDetails(id);
  },

  async createInvite(ctx: AuthContext, params: unknown) {
    const data: CreateInviteParams = createInviteSchema.parse(params);
    await assertCanManageInvites(ctx, data.schoolId);

    const newInvite = await invitesRepo.create({
      ...data,
      invitedByUserId: ctx.userId!,
    });

    return await invitesRepo.getWithDetails(newInvite[0].id);
  },

  async updateInvite(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateInviteParams = updateInviteSchema.parse(params);
    
    const existingInvite = await invitesRepo.getById(id);
    if (!existingInvite[0]) {
      throw new Error("Invite not found");
    }

    await assertCanManageInvites(ctx, existingInvite[0].schoolId);

    const updatedInvite = await invitesRepo.update(id, data);
    return await invitesRepo.getWithDetails(id);
  },

  async deleteInvite(ctx: AuthContext, id: string) {
    const existingInvite = await invitesRepo.getById(id);
    if (!existingInvite[0]) {
      throw new Error("Invite not found");
    }

    await assertCanManageInvites(ctx, existingInvite[0].schoolId);

    await invitesRepo.delete(id);
    return { success: true };
  },

  async acceptInvite(ctx: AuthContext, params: unknown) {
    const { id, userId } = acceptInviteSchema.parse(params);
    
    const inviteData = await invitesRepo.getById(id);
    if (!inviteData[0]) {
      throw new Error("Invite not found");
    }

    // Check if user can accept this invite (must be the invited user)
    if (ctx.userId !== userId) {
      throw new Error("Unauthorized to accept this invite");
    }

    // Update invite status
    const updatedInvite = await invitesRepo.update(id, { status: "ACCEPTED" });
    
    // TODO: Here you would typically create the user role assignment
    // This would involve calling the roles service to assign the role
    
    return await invitesRepo.getWithDetails(id);
  },
};
