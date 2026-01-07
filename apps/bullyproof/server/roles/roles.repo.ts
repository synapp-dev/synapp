import { db } from "@/server/db/drizzle";
import { roles, userRoles, userProfile, schools } from "@/server/db/schema";
import { eq, and, inArray, desc, asc, isNull } from "drizzle-orm";

export const rolesRepo = {
  getAll: () => db.select().from(roles),

  getById: (id: string) =>
    db.select().from(roles).where(eq(roles.id, id)).limit(1),

  getByScope: (scope: string) =>
    db
      .select()
      .from(roles)
      .where(eq(roles.scopeId, scope))
      .orderBy(asc(roles.name)),

  getByKey: (key: string) =>
    db
      .select()
      .from(roles)
      .where(eq(roles.key, key))
      .limit(1),

  getUserRoles: (userId: string) =>
    db
      .select({
        role: roles,
        userRole: userRoles,
        school: schools,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(schools, eq(userRoles.schoolId, schools.id))
      .where(eq(userRoles.userId, userId))
      .orderBy(asc(roles.name)),

  /**
   * Check if a user has any platform role
   */
  userHasPlatformRole: async (userId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          inArray(roles.key, ["PLATFORM_ADMIN", "GOVERNMENT_VIEWER", "PLATFORM_STAFF"]),
          isNull(userRoles.schoolId)
        )
      )
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if a user has any school role
   */
  userHasSchoolRole: async (userId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          // School roles have a school_id (NOT NULL)
        )
      );
    // Check if any role has a school_id (indicating it's a school role)
    return result.some((ur) => ur.schoolId !== null);
  },

  /**
   * Check if a role is a platform role
   */
  isPlatformRole: async (roleId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          inArray(roles.key, ["PLATFORM_ADMIN", "GOVERNMENT_VIEWER", "PLATFORM_STAFF"])
        )
      )
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if a role is a school role
   */
  isSchoolRole: async (roleId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          inArray(roles.key, ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF", "SCHOOL_LICENCE"])
        )
      )
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if a role is SCHOOL_LICENCE
   */
  isSchoolLicenceRole: async (roleId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.key, "SCHOOL_LICENCE")))
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if user has SCHOOL_LICENCE role
   */
  userHasSchoolLicence: async (userId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(roles.key, "SCHOOL_LICENCE")
        )
      )
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if user has any non-SCHOOL_LICENCE school roles
   */
  userHasNonLicenceSchoolRole: async (userId: string): Promise<boolean> => {
    const result = await db
      .select()
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          // School roles have school_id
          // Exclude SCHOOL_LICENCE
          inArray(roles.key, ["TEACHER", "SCHOOL_ADMIN", "SCHOOL_STAFF"])
        )
      )
      .limit(1);
    return result.length > 0;
  },

  /**
   * Get all roles for a user (for validation purposes)
   */
  getUserRoleKeys: async (userId: string): Promise<string[]> => {
    const result = await db
      .select({ roleKey: roles.key })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    return result.map((r) => r.roleKey || "").filter(Boolean);
  },

  assignRole: async (data: {
    userId: string;
    roleId: string;
    schoolId?: string;
    roleScope?: string;
  }) => {
    // Validate platform/school role constraints before assignment
    const isAssigningPlatformRole = await rolesRepo.isPlatformRole(data.roleId);
    const isAssigningSchoolRole = await rolesRepo.isSchoolRole(data.roleId);
    const userHasPlatformRole = await rolesRepo.userHasPlatformRole(data.userId);
    const userHasSchoolRole = await rolesRepo.userHasSchoolRole(data.userId);
    const userRoleKeys = await rolesRepo.getUserRoleKeys(data.userId);

    // If assigning a platform role
    if (isAssigningPlatformRole) {
      // Ensure platform role has NULL school_id
      if (data.schoolId) {
        throw new Error(
          "Platform roles must have school_id set to NULL"
        );
      }
      
      // Platform roles are exclusive - user can only have one role total
      if (userRoleKeys.length > 0) {
        throw new Error(
          "Users with platform roles can only have one role. Please remove all other roles first."
        );
      }
    }

    // If assigning a school role
    if (isAssigningSchoolRole) {
      // Ensure school role has a school_id
      if (!data.schoolId) {
        throw new Error(
          "School roles must have a school_id"
        );
      }
      
      // Users with platform roles cannot have school roles
      if (userHasPlatformRole) {
        throw new Error(
          "Users with platform roles cannot have school roles. Please remove platform roles first."
        );
      }

      // Check SCHOOL_LICENCE exclusivity
      const isAssigningSchoolLicence = await rolesRepo.isSchoolLicenceRole(data.roleId);
      const userHasSchoolLicence = await rolesRepo.userHasSchoolLicence(data.userId);
      const userHasNonLicenceSchoolRole = await rolesRepo.userHasNonLicenceSchoolRole(data.userId);

      // If assigning SCHOOL_LICENCE, user cannot have other school roles
      if (isAssigningSchoolLicence && userHasNonLicenceSchoolRole) {
        throw new Error(
          "Users with school roles cannot have SCHOOL_LICENCE. Please remove all other school roles first."
        );
      }

      // If assigning non-SCHOOL_LICENCE school role, user cannot have SCHOOL_LICENCE
      if (!isAssigningSchoolLicence && userHasSchoolLicence) {
        throw new Error(
          "Users with SCHOOL_LICENCE cannot have other school roles. Please remove SCHOOL_LICENCE first."
        );
      }
    }

    // If user has platform roles, prevent assigning school roles
    if (userHasPlatformRole && isAssigningSchoolRole) {
      throw new Error(
        "Users with platform roles cannot have school roles. Please remove platform roles first."
      );
    }

    // If user has school roles, prevent assigning platform roles
    if (userHasSchoolRole && isAssigningPlatformRole) {
      throw new Error(
        "Users with school roles cannot have platform roles. Please remove school roles first."
      );
    }

    return db
      .insert(userRoles)
      .values({
        ...data,
        roleScope:
          data.roleScope || (data.schoolId ? "school" : "platform"),
      })
      .returning();
  },

  hasRole: (userId: string, roleId: string, schoolId: string) =>
    db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId),
          eq(userRoles.schoolId, schoolId)
        )
      )
      .limit(1),

  removeRole: (userId: string, roleId: string, schoolId?: string) => {
    const whereConditions = [
      eq(userRoles.userId, userId),
      eq(userRoles.roleId, roleId),
    ];

    if (schoolId) {
      whereConditions.push(eq(userRoles.schoolId, schoolId));
    }

    return db.delete(userRoles).where(and(...whereConditions));
  },

  getUsersByRole: (roleId: string, schoolId?: string) => {
    const whereConditions = [eq(userRoles.roleId, roleId)];

    if (schoolId) {
      whereConditions.push(eq(userRoles.schoolId, schoolId));
    }

    return db
      .select({
        user: userProfile,
        userRole: userRoles,
        school: schools,
      })
      .from(userRoles)
      .innerJoin(userProfile, eq(userRoles.userId, userProfile.id))
      .leftJoin(schools, eq(userRoles.schoolId, schools.id))
      .where(and(...whereConditions))
      .orderBy(asc(userProfile.firstName));
  },

  create: (data: {
    name: string;
    key: string;
    description?: string;
    scope: string;
  }) =>
    db
      .insert(roles)
      .values({ ...data, scopeId: data.scope } as any)
      .returning(),

  update: (
    id: string,
    data: {
      name?: string;
      key?: string;
      description?: string;
    }
  ) => db.update(roles).set(data).where(eq(roles.id, id)).returning(),

  delete: (id: string) => db.delete(roles).where(eq(roles.id, id)),
};
