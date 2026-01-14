import {
  listSchoolsQuerySchema,
  createSchoolSchema,
  updateSchoolSchema,
  type ListSchoolsQuery,
  type CreateSchoolParams,
  type UpdateSchoolParams,
} from "./school.validators";
import { schoolRepo } from "./school.repo";
import { getUserScopedRoles } from "../auth/rbac";
import { db } from "@/server/db/drizzle";
import { schoolLevelAssignments } from "@/server/db/schema";
import { eq } from "drizzle-orm";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

async function assertCanListSchools(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  // Extend with real RBAC (e.g., require specific roles/permissions)
  const roles = await getUserScopedRoles(ctx.userId);
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }
  if (roles.school.length === 0) {
    // throw new Error("Unauthorized");
    return;
  }
}

/**
 * Get school IDs that the user has access to based on their role
 * - PLATFORM_ADMIN: returns undefined (can access all schools)
 * - TEACHER: returns only schools where they have TEACHER role
 * - SCHOOL_ADMIN: returns schools where they have SCHOOL_ADMIN role
 * - Other roles: returns their associated schools
 */
async function getUserAccessibleSchoolIds(
  userId: string
): Promise<string[] | undefined> {
  const roles = await getUserScopedRoles(userId);

  // Platform admins can access all schools
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return undefined;
  }

  // Get school IDs from user's school roles
  const schoolIds = roles.school
    .map((role) => role.schoolId)
    .filter((id): id is string => id !== null && id !== undefined);

  // If user has no school roles, return empty array (no access)
  if (schoolIds.length === 0) {
    return [];
  }

  // Check if user is a teacher (has TEACHER role in any school)
  const isTeacher = roles.school.some((role) => role.roleKey === "TEACHER");

  if (isTeacher) {
    // Teachers can only access schools where they have TEACHER role
    const teacherSchoolIds = roles.school
      .filter((role) => role.roleKey === "TEACHER")
      .map((role) => role.schoolId)
      .filter((id): id is string => id !== null && id !== undefined);
    return teacherSchoolIds.length > 0 ? teacherSchoolIds : [];
  }

  // For other roles (like SCHOOL_ADMIN), return all their associated schools
  return schoolIds;
}

async function assertCanCreateSchool(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const roles = await getUserScopedRoles(ctx.userId);
  // Only platform admins can create schools
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }
  throw new Error("Unauthorized to create schools");
}

async function assertCanUpdateSchool(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const roles = await getUserScopedRoles(ctx.userId);
  // Only platform admins can update schools
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }
  throw new Error("Unauthorized to update schools");
}

async function assertCanDeleteSchool(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const roles = await getUserScopedRoles(ctx.userId);
  // Only platform admins can delete schools
  if (roles.platform.includes("PLATFORM_ADMIN")) {
    return;
  }
  throw new Error("Unauthorized to delete schools");
}

export const schoolService = {
  async listSchools(ctx: AuthContext, query: unknown) {
    await assertCanListSchools(ctx);
    const params: ListSchoolsQuery = listSchoolsQuerySchema.parse(query);

    // Get accessible school IDs based on user role
    if (!ctx.userId) {
      throw new Error("Unauthorized");
    }
    const accessibleSchoolIds = await getUserAccessibleSchoolIds(ctx.userId);

    // If accessibleSchoolIds is undefined, user can access all schools (PLATFORM_ADMIN)
    // If it's an empty array, user has no access
    // Otherwise, filter by the accessible school IDs
    const queryParams = {
      ...params,
      ...(accessibleSchoolIds !== undefined && {
        schoolIds: accessibleSchoolIds,
      }),
    };

    const rows = await schoolRepo.getAllPaginated(queryParams);
    return rows;
  },
  async getSchoolBySlug(ctx: AuthContext, slug: string) {
    await assertCanListSchools(ctx);
    const rows = await schoolRepo.getBySlug(slug);
    return rows[0] ?? null;
  },
  async createSchool(ctx: AuthContext, params: unknown) {
    await assertCanCreateSchool(ctx);
    const data: CreateSchoolParams = createSchoolSchema.parse(params);

    // Extract levelIds before creating school (repo doesn't need them)
    const { levelIds, ...schoolData } = data;

    // Create the school
    const result = await schoolRepo.create({
      name: schoolData.name,
      stateId: schoolData.stateId,
      sectorId: schoolData.sectorId,
    });
    const createdSchool = result[0];

    // Create school level assignments
    if (levelIds && levelIds.length > 0) {
      await db.insert(schoolLevelAssignments).values(
        levelIds.map((levelId) => ({
          schoolId: createdSchool.id,
          levelId,
        }))
      );
    }

    return createdSchool;
  },
  async updateSchool(ctx: AuthContext, schoolId: string, params: unknown) {
    await assertCanUpdateSchool(ctx);
    const data: UpdateSchoolParams = updateSchoolSchema.parse(params);

    // Extract levelIds before updating school (repo doesn't handle them)
    const { levelIds, ...schoolData } = data;

    // Update the school
    const updatedSchool = await schoolRepo.update(schoolId, schoolData);

    if (!updatedSchool) {
      throw new Error("School not found");
    }

    // Update school level assignments if levelIds provided
    if (levelIds !== undefined) {
      // Delete existing level assignments
      await db
        .delete(schoolLevelAssignments)
        .where(eq(schoolLevelAssignments.schoolId, schoolId));

      // Insert new level assignments
      if (levelIds.length > 0) {
        await db.insert(schoolLevelAssignments).values(
          levelIds.map((levelId) => ({
            schoolId,
            levelId,
          }))
        );
      }
    }

    return updatedSchool;
  },
  async deleteSchool(ctx: AuthContext, schoolId: string) {
    await assertCanDeleteSchool(ctx);
    
    // Delete the school - CASCADE will handle related records:
    // - school_licences
    // - school_invites
    // - classes
    // - lessons
    // - user_roles (school-scoped)
    // - user_school_positions
    // - school_level_assignments
    const deletedSchool = await schoolRepo.delete(schoolId);
    
    if (!deletedSchool) {
      throw new Error("School not found");
    }
    
    return deletedSchool;
  },
};
