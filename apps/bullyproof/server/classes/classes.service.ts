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

    const { yearIds, teacherIds, ...classData } = data;
    const updatedClass = await classesRepo.update(id, classData);

    if (yearIds !== undefined) {
      await classesRepo.removeYears(id);
      if (yearIds.length > 0) {
        await classesRepo.assignYears(id, yearIds);
      }
    }

    if (teacherIds !== undefined) {
      await classesRepo.removeTeachers(id);
      if (teacherIds.length > 0) {
        await classesRepo.assignTeachers(id, teacherIds);
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

  async deleteClassesBatch(ctx: AuthContext, ids: string[]) {
    if (ids.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // Get all classes to verify permissions
    const existingClasses = await Promise.all(
      ids.map((id) => classesRepo.getById(id))
    );

    // Group by schoolId to check permissions efficiently
    const schoolIds = new Set<string>();
    for (const classResult of existingClasses) {
      if (classResult[0]) {
        schoolIds.add(classResult[0].schoolId);
      }
    }

    // Check permissions for all schools
    for (const schoolId of schoolIds) {
      await assertCanManageClasses(ctx, schoolId);
    }

    // Verify all classes exist
    const notFoundIds = ids.filter(
      (id, index) => !existingClasses[index]?.[0]
    );
    if (notFoundIds.length > 0) {
      throw new Error(`Classes not found: ${notFoundIds.join(", ")}`);
    }

    // Batch delete all classes and related records
    await classesRepo.deleteBatch(ids);
    return { success: true, deletedCount: ids.length };
  },

  async bulkUpdateYearLevels(
    ctx: AuthContext,
    params: {
      classIds: string[];
      yearIds?: string[];
      action?: "assign" | "replace";
      startYear?: string;
    }
  ) {
    const { classIds, yearIds = [], action = "assign", startYear } = params;

    if (classIds.length === 0) {
      return {
        success: true,
        results: [],
        summary: { total: 0, succeeded: 0, failed: 0 },
      };
    }

    if (yearIds.length === 0 && !startYear) {
      throw new Error(
        "At least one year level or running year must be provided"
      );
    }

    // Get all classes to verify permissions and get class names
    const existingClasses = await Promise.all(
      classIds.map((id) => classesRepo.getById(id))
    );

    // Group by schoolId to check permissions efficiently
    const schoolIds = new Set<string>();
    for (const classResult of existingClasses) {
      if (classResult[0]) {
        schoolIds.add(classResult[0].schoolId);
      }
    }

    // Check permissions for all schools
    for (const schoolId of schoolIds) {
      await assertCanManageClasses(ctx, schoolId);
    }

    // Process each class
    const results: Array<{
      classId: string;
      className: string;
      success: boolean;
      message: string;
    }> = [];

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < classIds.length; i++) {
      const classId = classIds[i];
      const classResult = existingClasses[i];

      if (!classResult[0]) {
        results.push({
          classId,
          className: "Unknown",
          success: false,
          message: "Class not found",
        });
        failed++;
        continue;
      }

      const className = classResult[0].name;

      try {
        const messages: string[] = [];

        // Handle year level updates if provided
        if (yearIds.length > 0) {
          if (action === "replace") {
            // Remove all existing year levels, then assign new ones
            await classesRepo.removeYears(classId);
            await classesRepo.assignYears(classId, yearIds);
            messages.push("Year levels replaced");
          } else {
            // Assign: Add new year levels without removing existing ones
            // First get existing year IDs to avoid duplicates
            const classWithYears = await classesRepo.getWithYears(classId);
            const existingYearIds =
              classWithYears?.years?.map((y: any) => y.yearId) || [];
            const newYearIds = yearIds.filter(
              (id) => !existingYearIds.includes(id)
            );

            if (newYearIds.length > 0) {
              await classesRepo.assignYears(classId, newYearIds);
              messages.push("Year levels assigned");
            } else {
              messages.push("Year levels already assigned");
            }
          }
        }

        // Handle running year update if provided (separate operation)
        if (startYear) {
          // startYear is an ISO datetime string from the API (e.g., "2026-01-01T00:00:00.000Z")
          // Validate it's a valid date string
          if (typeof startYear !== "string") {
            throw new Error(`startYear must be a string, got: ${typeof startYear}`);
          }
          
          const dateObj = new Date(startYear);
          if (isNaN(dateObj.getTime())) {
            throw new Error(`Invalid startYear date string: ${startYear}`);
          }
          
          // Ensure the string is in ISO format for PostgreSQL timestamptz
          // Drizzle with mode: 'string' expects a valid ISO 8601 string
          const isoString = dateObj.toISOString();
          
          await classesRepo.update(classId, { startYear: isoString });
          const year = dateObj.getFullYear();
          messages.push(`Running year set to ${year}`);
        }

        // Build success message
        if (messages.length === 0) {
          // This shouldn't happen due to validation, but handle it gracefully
          results.push({
            classId,
            className,
            success: false,
            message: "No updates provided",
          });
          failed++;
        } else {
          results.push({
            classId,
            className,
            success: true,
            message: messages.join(", ") + " successfully",
          });
          succeeded++;
        }
      } catch (error: any) {
        results.push({
          classId,
          className,
          success: false,
          message: error.message || "Failed to update year levels",
        });
        failed++;
      }
    }

    return {
      success: failed === 0,
      results,
      summary: {
        total: classIds.length,
        succeeded,
        failed,
      },
    };
  },
};
