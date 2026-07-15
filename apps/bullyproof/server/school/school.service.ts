import {
  listSchoolsQuerySchema,
  createSchoolSchema,
  updateSchoolSchema,
  type ListSchoolsQuery,
  type CreateSchoolParams,
  type UpdateSchoolParams,
} from "./school.validators";
import { schoolRepo } from "./school.repo";
import { resolveSchoolId } from "./resolve-school-ref";
import { curriculumRepo } from "../curriculum/curriculum.repo";
import { permissionTemplatesService } from "../permission-templates/permission-templates.service";
import { getUserScopedRoles } from "../auth/rbac";
import { checkFeatureAccess, assertFeature } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import {
  schoolLevelAssignments,
  schoolYearAssignments,
  schoolYears,
} from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";

// Placeholder auth context type; adapt to your actual session/context
type AuthContext = {
  userId: string | null;
  roles?: string[];
};

type SchoolStatus = "onboarding" | "ready" | "active" | "certification";

function resolveSchoolStatus(row: {
  id: string;
  teacherCount?: number | null;
  classCount?: number | null;
  schoolAdminCount?: number | null;
  schoolLicenceCount?: number | null;
}, fullUnlockActiveBySchoolId: Record<string, boolean>, certificationUnlockActiveBySchoolId: Record<string, boolean>): SchoolStatus {
  const teacherCount = Number(row.teacherCount ?? 0);
  const classCount = Number(row.classCount ?? 0);
  const schoolAdminCount = Number(row.schoolAdminCount ?? 0);
  const schoolLicenceCount = Number(row.schoolLicenceCount ?? 0);

  const isReady =
    teacherCount >= 1 &&
    classCount >= 1 &&
    schoolAdminCount >= 1 &&
    schoolLicenceCount >= 1;
  const isActive = !!fullUnlockActiveBySchoolId[row.id];
  const isCertification = !!certificationUnlockActiveBySchoolId[row.id];

  if (isActive) return "active";
  if (isCertification) return "certification";
  return isReady ? "ready" : "onboarding";
}

async function assertCanListSchools(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const hasAdminSchools = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (hasAdminSchools) return;
  const roles = await getUserScopedRoles(ctx.userId);
  if (roles.school.length > 0) return;
  throw new Error("Unauthorized");
}

/**
 * Get school IDs that the user has access to.
 * - admin_schools feature: returns undefined (can access all schools)
 * - Otherwise: returns school IDs from user's school roles (from user_roles)
 */
async function getUserAccessibleSchoolIds(
  userId: string
): Promise<string[] | undefined> {
  const hasAdminSchools = await checkFeatureAccess(userId, "/admin/schools");
  if (hasAdminSchools) return undefined;

  const roles = await getUserScopedRoles(userId);
  const schoolIds = roles.school
    .map((role) => role.schoolId)
    .filter((id): id is string => id !== null && id !== undefined);
  if (schoolIds.length === 0) return [];

  const isTeacher = roles.school.some((role) => role.roleKey === "TEACHER");
  if (isTeacher) {
    const teacherSchoolIds = roles.school
      .filter((role) => role.roleKey === "TEACHER")
      .map((role) => role.schoolId)
      .filter((id): id is string => id !== null && id !== undefined);
    return teacherSchoolIds.length > 0 ? teacherSchoolIds : [];
  }
  return schoolIds;
}

async function assertCanCreateSchool(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/schools");
}

async function assertCanUpdateSchool(ctx: AuthContext) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const hasAdminSchools = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (hasAdminSchools) return;
  throw new Error("Unauthorized to update school");
}

async function assertCanDeleteSchool(ctx: AuthContext) {
  await assertFeature(ctx, "/admin/schools");
  // Destructive action: enforce the delete-school action feature server-side,
  // not just on the UI button that renders it.
  await assertFeature(ctx, "admin:delete-school");
}

async function assertCanViewSchool(ctx: AuthContext, schoolId: string) {
  if (!ctx.userId) {
    throw new Error("Unauthorized");
  }
  const hasAdminSchools = await checkFeatureAccess(ctx.userId, "/admin/schools");
  if (hasAdminSchools) return;
  const roles = await getUserScopedRoles(ctx.userId);
  if (roles.school.some((role) => role.schoolId === schoolId)) return;
  throw new Error("Unauthorized to view school");
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

    // If accessibleSchoolIds is undefined, user has admin_schools and can access all schools
    // If it's an empty array, user has no access
    // Otherwise, filter by the accessible school IDs
    const queryParams = {
      ...params,
      ...(accessibleSchoolIds !== undefined && {
        schoolIds: accessibleSchoolIds,
      }),
    };

    const rows = await schoolRepo.getAllPaginated(queryParams);
    const schoolIds = rows.map((row) => row.id).filter(Boolean);
    const fullUnlockActiveBySchoolId =
      await permissionTemplatesService.getFullSchoolUnlockActiveBySchoolIds(
        schoolIds
      );
    const certificationUnlockActiveBySchoolId =
      await permissionTemplatesService.getCertificationUnlockActiveBySchoolIds(
        schoolIds
      );

    return rows.map((row) => ({
      ...row,
      status: resolveSchoolStatus(
        row,
        fullUnlockActiveBySchoolId,
        certificationUnlockActiveBySchoolId
      ),
    }));
  },
  async getYearsForSchool(ctx: AuthContext, schoolId: string) {
    await assertCanViewSchool(ctx, schoolId);
    return curriculumRepo.getYearsForSchool(schoolId);
  },

  async getSchoolBySlug(ctx: AuthContext, slug: string) {
    // First fetch the school by slug to get its ID
    const rows = await schoolRepo.getBySlug(slug);
    const school = rows[0] ?? null;

    if (!school) {
      return null;
    }

    // Check if user has permission to view this specific school
    await assertCanViewSchool(ctx, school.id);

    const fullUnlockActiveBySchoolId =
      await permissionTemplatesService.getFullSchoolUnlockActiveBySchoolIds([
        school.id,
      ]);
    const certificationUnlockActiveBySchoolId =
      await permissionTemplatesService.getCertificationUnlockActiveBySchoolIds([
        school.id,
      ]);

    return {
      ...school,
      status: resolveSchoolStatus(
        school,
        fullUnlockActiveBySchoolId,
        certificationUnlockActiveBySchoolId
      ),
    };
  },

  async getSchoolStats(ctx: AuthContext, schoolIdOrSlug: string) {
    const schoolId = await resolveSchoolId(schoolIdOrSlug);
    if (!schoolId) return null;
    await assertCanViewSchool(ctx, schoolId);
    return schoolRepo.getSchoolStats(schoolId);
  },

  async getKeyStaff(ctx: AuthContext, schoolIdOrSlug: string) {
    const schoolId = await resolveSchoolId(schoolIdOrSlug);
    if (!schoolId) return null;
    await assertCanViewSchool(ctx, schoolId);
    return schoolRepo.getKeyStaff(schoolId);
  },
  async createSchool(ctx: AuthContext, params: unknown) {
    await assertCanCreateSchool(ctx);
    const data: CreateSchoolParams = createSchoolSchema.parse(params);

    const { levelIds, yearIds, ...schoolData } = data;

    const result = await schoolRepo.create({
      name: schoolData.name,
      stateId: schoolData.stateId,
      sectorId: schoolData.sectorId,
      contentTypeId: schoolData.contentTypeId,
    });
    const createdSchool = result[0];

    let yearIdsToAssign: string[];
    if (yearIds && yearIds.length > 0) {
      yearIdsToAssign = yearIds;
    } else if (levelIds && levelIds.length > 0) {
      const yearsRows = await db
        .select({ id: schoolYears.id })
        .from(schoolYears)
        .where(inArray(schoolYears.levelId, levelIds));
      yearIdsToAssign = yearsRows.map((r) => r.id);
      await db.insert(schoolLevelAssignments).values(
        levelIds.map((levelId) => ({
          schoolId: createdSchool.id,
          levelId,
        }))
      );
    } else {
      yearIdsToAssign = [];
    }

    if (yearIdsToAssign.length > 0) {
      await db.insert(schoolYearAssignments).values(
        yearIdsToAssign.map((schoolYearId) => ({
          schoolId: createdSchool.id,
          schoolYearId,
        }))
      );
    }

    return createdSchool;
  },
  async updateSchool(ctx: AuthContext, schoolId: string, params: unknown) {
    await assertCanUpdateSchool(ctx);
    const data: UpdateSchoolParams = updateSchoolSchema.parse(params);

    const { levelIds, yearIds, ...schoolData } = data;

    const updatedSchool = await schoolRepo.update(schoolId, schoolData);

    if (!updatedSchool) {
      throw new Error("School not found");
    }

    if (levelIds !== undefined) {
      await db
        .delete(schoolLevelAssignments)
        .where(eq(schoolLevelAssignments.schoolId, schoolId));
      if (levelIds.length > 0) {
        await db.insert(schoolLevelAssignments).values(
          levelIds.map((levelId) => ({ schoolId, levelId }))
        );
      }
    }

    if (yearIds !== undefined) {
      await db
        .delete(schoolYearAssignments)
        .where(eq(schoolYearAssignments.schoolId, schoolId));
      if (yearIds.length > 0) {
        await db.insert(schoolYearAssignments).values(
          yearIds.map((schoolYearId) => ({ schoolId, schoolYearId }))
        );
      }
    } else if (levelIds !== undefined && levelIds.length > 0) {
      const yearsRows = await db
        .select({ id: schoolYears.id })
        .from(schoolYears)
        .where(inArray(schoolYears.levelId, levelIds));
      await db
        .delete(schoolYearAssignments)
        .where(eq(schoolYearAssignments.schoolId, schoolId));
      if (yearsRows.length > 0) {
        await db.insert(schoolYearAssignments).values(
          yearsRows.map((r) => ({ schoolId, schoolYearId: r.id }))
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
