import {
  createClassSchema,
  updateClassSchema,
  listClassesSchema,
  getClassByIdSchema,
  type CreateClassParams,
  type UpdateClassParams,
  type ListClassesParams,
  type GetClassByIdParams,
} from "./classes.validators";
import { classesRepo } from "./classes.repo";
import { getUserScopedRoles } from "../auth/rbac";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanManageClasses(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can manage all classes
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // School admins/teachers can manage classes in their schools
  if (
    schoolId &&
    roles.school.some(
      (role) =>
        role.schoolId === schoolId &&
        (role.roleKey === "SCHOOL_ADMIN" || role.roleKey === "TEACHER")
    )
  ) {
    return;
  }

  throw new Error("Unauthorized to manage classes");
}

async function assertCanViewClasses(ctx: AuthContext, schoolId?: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }

  const roles = await getUserScopedRoles(ctx.userId);

  // Platform admins can view all classes
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }

  // School users can view classes in their schools
  if (schoolId && roles.school.some((role) => role.schoolId === schoolId)) {
    return;
  }

  throw new Error("Unauthorized to view classes");
}

export const classesService = {
  async listClasses(ctx: AuthContext, query: unknown) {
    const params: ListClassesParams = listClassesSchema.parse(query);
    await assertCanViewClasses(ctx, params.schoolId);

    if (params.schoolId) {
      return await classesRepo.getBySchoolId(params.schoolId);
    }

    // For platform admins, return all classes
    return await classesRepo.getAll();
  },

  async getClassById(ctx: AuthContext, params: unknown) {
    const { id } = getClassByIdSchema.parse(params);

    const classData = await classesRepo.getById(id);
    if (!classData[0]) {
      return null;
    }

    await assertCanViewClasses(ctx, classData[0].schoolId);

    return await classesRepo.getWithYears(id);
  },

  async createClass(ctx: AuthContext, params: unknown) {
    const data: CreateClassParams = createClassSchema.parse(params);
    await assertCanManageClasses(ctx, data.schoolId);

    const { yearIds, ...classData } = data;
    const newClass = await classesRepo.create(classData);

    if (yearIds && yearIds.length > 0) {
      await classesRepo.assignYears(newClass[0]!.id, yearIds);
    }

    return await classesRepo.getWithYears(newClass[0]!.id);
  },

  async updateClass(ctx: AuthContext, id: string, params: unknown) {
    const data: UpdateClassParams = updateClassSchema.parse(params);

    const existingClass = await classesRepo.getById(id);
    if (!existingClass[0]) {
      throw new Error("Class not found");
    }

    await assertCanManageClasses(ctx, existingClass[0].schoolId);

    const { yearIds, ...classData } = data;
    const updatedClass = await classesRepo.update(id, classData);

    if (yearIds !== undefined) {
      await classesRepo.removeYears(id);
      if (yearIds.length > 0) {
        await classesRepo.assignYears(id, yearIds);
      }
    }

    return await classesRepo.getWithYears(id);
  },

  async deleteClass(ctx: AuthContext, id: string) {
    const existingClass = await classesRepo.getById(id);
    if (!existingClass[0]) {
      throw new Error("Class not found");
    }

    await assertCanManageClasses(ctx, existingClass[0].schoolId);

    await classesRepo.delete(id);
    return { success: true };
  },
};
