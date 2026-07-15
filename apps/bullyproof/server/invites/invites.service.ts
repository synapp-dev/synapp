import {
  createInviteSchema,
  updateInviteSchema,
  listInvitesSchema,
  getInviteByIdSchema,
  acceptInviteSchema,
  type CreateInviteParams,
  type UpdateInviteParams,
  type ListInvitesParams,
} from "./invites.validators";
import { invitesRepo } from "./invites.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageInvites(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) throw new Error("Unauthorized");
  const hasAdminSchools = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (hasAdminSchools) return;
  if (schoolId) {
    const roles = await getUserScopedRoles(ctx.userId);
    if (
      roles.school.some(
        (r) => r.schoolId === schoolId && r.roleKey === "SCHOOL_ADMIN"
      )
    )
      return;
  }
  throw new Error("Unauthorized to manage invites");
}

async function assertCanViewInvites(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) throw new Error("Unauthorized");
  const hasAdminSchools = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (hasAdminSchools) return;
  if (schoolId) {
    const roles = await getUserScopedRoles(ctx.userId);
    if (
      roles.school.some(
        (r) => r.schoolId === schoolId && r.roleKey === "SCHOOL_ADMIN"
      )
    )
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

    const adminClient = await createServerAdminClient();

    // Check if user already exists by email
    console.log(
      "[INVITE CREATE] Checking for existing user with email:",
      data.email
    );
    const { data: existingUsers, error: listUsersError } =
      await adminClient.auth.admin.listUsers();

    if (listUsersError) {
      console.error("[INVITE CREATE] Database error - Failed to list users:", {
        error: listUsersError,
        message: listUsersError.message,
        status: listUsersError.status,
        name: listUsersError.name,
        stack: listUsersError.stack,
      });
      throw new Error(
        `Failed to check existing users: ${listUsersError.message}`
      );
    }

    let existingUser = existingUsers?.users?.find(
      (u: { email?: string }) =>
        u.email?.toLowerCase() === data.email.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User already exists - use existing userId
      console.log(
        "[INVITE CREATE] User already exists, userId:",
        existingUser.id
      );
      userId = existingUser.id;

      // Verify user_profile exists (should exist, but check to be safe)
      console.log(
        "[INVITE CREATE] Verifying user_profile exists for userId:",
        userId
      );
      const { error: profileError } = await adminClient
        .from("user_profile")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(
          "[INVITE CREATE] Database error - Failed to verify user_profile:",
          {
            error: profileError,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            userId: userId,
          }
        );

        if (profileError.code === "PGRST116") {
          // Profile doesn't exist - create it (trigger may have failed)
          console.log(
            "[INVITE CREATE] User profile not found, creating manually..."
          );
          const { error: insertError } = await adminClient
            .from("user_profile")
            .insert({
              id: userId,
              email: data.email,
            });

          if (insertError) {
            console.error(
              "[INVITE CREATE] Database error - Failed to create user_profile:",
              {
                error: insertError,
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                userId: userId,
                email: data.email,
              }
            );
            throw new Error(
              `Failed to create user profile: ${insertError.message}`
            );
          }
          console.log("[INVITE CREATE] User profile created successfully");
        } else {
          throw new Error(
            `Failed to verify user profile: ${profileError.message}`
          );
        }
      } else {
        console.log("[INVITE CREATE] User profile verified successfully");
      }
    } else {
      // Create new user in auth.users
      console.log(
        "[INVITE CREATE] Creating new user in auth.users for email:",
        data.email
      );
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: data.email,
          email_confirm: true, // Auto-confirm email
        });

      if (createError) {
        console.error(
          "[INVITE CREATE] Database error - Failed to create user in auth.users:",
          {
            error: createError,
            message: createError.message,
            status: createError.status,
            name: createError.name,
            email: data.email,
          }
        );
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      if (!newUser.user) {
        console.error(
          "[INVITE CREATE] Database error - No user returned from createUser:",
          {
            newUser: newUser,
            email: data.email,
          }
        );
        throw new Error("Failed to create user: No user returned");
      }

      userId = newUser.user.id;
      console.log("[INVITE CREATE] User created successfully, userId:", userId);

      // Wait a moment for the database trigger to create user_profile
      // Then verify it was created successfully
      console.log(
        "[INVITE CREATE] Waiting for trigger to create user_profile..."
      );
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms for trigger

      const { error: profileError } = await adminClient
        .from("user_profile")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error(
          "[INVITE CREATE] Database error - Failed to verify user_profile after trigger:",
          {
            error: profileError,
            code: profileError.code,
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            userId: userId,
            email: data.email,
          }
        );

        if (profileError.code === "PGRST116") {
          // Profile doesn't exist - trigger may have failed, create it manually
          console.log(
            "[INVITE CREATE] Trigger failed, creating user_profile manually..."
          );
          const { error: insertError } = await adminClient
            .from("user_profile")
            .insert({
              id: userId,
              email: data.email,
            });

          if (insertError) {
            console.error(
              "[INVITE CREATE] Database error - Failed to create user_profile manually:",
              {
                error: insertError,
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint,
                userId: userId,
                email: data.email,
              }
            );
            throw new Error(
              `Failed to create user profile: ${insertError.message}`
            );
          }
          console.log(
            "[INVITE CREATE] User profile created manually successfully"
          );
        } else {
          throw new Error(
            `Failed to verify user profile: ${profileError.message}`
          );
        }
      } else {
        console.log(
          "[INVITE CREATE] User profile verified successfully after trigger"
        );
      }
    }

    // Now create the invite with the userId
    console.log("[INVITE CREATE] Creating invite in database:", {
      schoolId: data.schoolId,
      email: data.email,
      roleKey: data.roleKey,
      userId: userId,
      invitedByUserId: ctx.userId,
    });

    try {
      const newInvite = await invitesRepo.create({
        ...data,
        invitedByUserId: ctx.userId!,
        userId: userId,
      });
      console.log(
        "[INVITE CREATE] Invite created successfully, inviteId:",
        newInvite[0]?.id
      );

      const inviteDetails = await invitesRepo.getWithDetails(newInvite[0].id);
      console.log("[INVITE CREATE] Invite details retrieved successfully");
      return inviteDetails;
    } catch (dbError: any) {
      console.error(
        "[INVITE CREATE] Database error - Failed to create invite:",
        {
          error: dbError,
          message: dbError?.message,
          code: dbError?.code,
          detail: dbError?.detail,
          hint: dbError?.hint,
          constraint: dbError?.constraint,
          table: dbError?.table,
          column: dbError?.column,
          dataType: dbError?.dataType,
          stack: dbError?.stack,
          inviteData: {
            schoolId: data.schoolId,
            email: data.email,
            roleKey: data.roleKey,
            userId: userId,
            invitedByUserId: ctx.userId,
          },
        }
      );
      throw dbError;
    }
  },

  async updateInvite(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateInviteParams = updateInviteSchema.parse(params);

    const existingInvite = await invitesRepo.getById(id);
    if (!existingInvite[0]) {
      throw new Error("Invite not found");
    }

    await assertCanManageInvites(ctx, existingInvite[0].schoolId);

    await invitesRepo.update(id, data);
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
    await invitesRepo.update(id, { status: "ACCEPTED" });

    // TODO: Here you would typically create the user role assignment
    // This would involve calling the roles service to assign the role

    return await invitesRepo.getWithDetails(id);
  },
};
