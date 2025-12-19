import {
  createLicenceSchema,
  updateLicenceSchema,
  listLicencesSchema,
  getLicenceByIdSchema,
  type CreateLicenceParams,
  type UpdateLicenceParams,
  type ListLicencesParams,
  type GetLicenceByIdParams,
} from "./licences.validators";
import { licencesRepo } from "./licences.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { userService } from "../user/user.service";
import { rolesRepo } from "../roles/roles.repo";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageLicences(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can manage all licences
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // School admins can manage licences for their schools
  if (
    schoolId &&
    roles.school.some(
      (role) => role.schoolId === schoolId && role.roleKey === "SCHOOL_ADMIN"
    )
  ) {
    return;
  }

  throw new Error("Unauthorized to manage licences");
}

async function assertCanViewLicences(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can view all licences
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // School admins can view licences for their schools
  if (
    schoolId &&
    roles.school.some(
      (role) => role.schoolId === schoolId && role.roleKey === "SCHOOL_ADMIN"
    )
  ) {
    return;
  }

  throw new Error("Unauthorized to view licences");
}

export const licencesService = {
  async listLicences(ctx: AuthContext, query: unknown) {
    const params: ListLicencesParams = listLicencesSchema.parse(query);
    await assertCanViewLicences(ctx, params.schoolId);

    if (params.schoolId) {
      return await licencesRepo.getBySchoolId(params.schoolId);
    }

    // For platform admins, return all licences
    return await licencesRepo.getAll();
  },

  async getLicenceById(ctx: AuthContext, params: unknown) {
    const { id } = getLicenceByIdSchema.parse(params);

    const licenceData = await licencesRepo.getById(id);
    if (!licenceData[0]) {
      return null;
    }

    await assertCanViewLicences(ctx, licenceData[0].schoolId);

    return await licencesRepo.getWithDetails(id);
  },

  async createLicence(ctx: AuthContext, params: unknown) {
    const data: CreateLicenceParams = createLicenceSchema.parse(params);
    await assertCanManageLicences(ctx, data.schoolId);

    // Calculate start and end dates from durationYears
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Start of today
    
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + data.durationYears);
    endDate.setHours(23, 59, 59, 999); // End of the target day

    // Format dates as ISO datetime strings
    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Extract email from metadata
    const email =
      data.metadata?.mainSchoolEmail &&
      typeof data.metadata.mainSchoolEmail === "string"
        ? data.metadata.mainSchoolEmail.trim()
        : null;

    // If no email provided, check if school has existing licences
    if (!email) {
      const existingLicences = await licencesRepo.getBySchoolId(data.schoolId);
      if (existingLicences.length === 0) {
        throw new Error(
          "School licence email is required when creating the first licence for a school"
        );
      }
      // School has existing licences, continue with licence creation
    } else {
      // Email provided - create/find user and assign role
      try {
        // Find or create user with the email
        const { userId } = await userService.createUserWithMagicLink(
          ctx,
          { email }
        );

        // Get SCHOOL_LICENCE role by key
        const schoolLicenceRole = await rolesRepo.getByKey("SCHOOL_LICENCE");
        if (!schoolLicenceRole[0]) {
          throw new Error("SCHOOL_LICENCE role not found");
        }

        // Check if user already has this role for this school
        const existingRole = await rolesRepo.hasRole(
          userId,
          schoolLicenceRole[0].id,
          data.schoolId
        );

        // Assign role if not already assigned
        if (existingRole.length === 0) {
          await rolesRepo.assignRole({
            userId,
            roleId: schoolLicenceRole[0].id,
            schoolId: data.schoolId,
            roleScope: "school",
          });
        }
      } catch (error: any) {
        // Re-throw with more context if it's not already a user-friendly error
        if (error.message && error.message.includes("required")) {
          throw error;
        }
        throw new Error(
          `Failed to create user and assign role: ${error.message || "Unknown error"}`
        );
      }
    }

    // Create the licence with calculated dates
    const newLicence = await licencesRepo.create({
      schoolId: data.schoolId,
      status: data.status,
      startDate: startDateISO,
      endDate: endDateISO,
      maxUsers: data.maxUsers,
      features: data.features,
      metadata: data.metadata,
      createdByUserId: ctx.userId!,
    });

    return await licencesRepo.getWithDetails(newLicence[0].id);
  },

  async updateLicence(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateLicenceParams = updateLicenceSchema.parse(params);

    const existingLicence = await licencesRepo.getById(id);
    if (!existingLicence[0]) {
      throw new Error("Licence not found");
    }

    await assertCanManageLicences(ctx, existingLicence[0].schoolId);

    const updatedLicence = await licencesRepo.update(id, data);
    return await licencesRepo.getWithDetails(id);
  },

  async deleteLicence(ctx: AuthContext, id: string) {
    const existingLicence = await licencesRepo.getById(id);
    if (!existingLicence[0]) {
      throw new Error("Licence not found");
    }

    await assertCanManageLicences(ctx, existingLicence[0].schoolId);

    await licencesRepo.delete(id);
    return { success: true };
  },

  async getActiveLicenceBySchoolId(ctx: AuthContext, schoolId: string) {
    await assertCanViewLicences(ctx, schoolId);

    const activeLicence = await licencesRepo.getActiveBySchoolId(schoolId);
    return activeLicence[0] ?? null;
  },
};
