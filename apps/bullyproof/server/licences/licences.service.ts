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

    const newLicence = await licencesRepo.create({
      ...data,
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
