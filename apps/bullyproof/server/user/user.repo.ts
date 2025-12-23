import { db } from "@/server/db/drizzle";
import { userProfile, userRoles, roles, schools } from "@/server/db/schema";
import { eq, ilike, or, and, asc } from "drizzle-orm";

export const userRepo = {
  getAllUsersWithRolesAndSchools: async (params: {
    limit: number;
    offset: number;
    search?: string;
    role?: string;
    schoolId?: string;
  }) => {
    const hasSearch =
      typeof params.search === "string" && params.search.trim().length > 0;
    const hasRoleFilter =
      typeof params.role === "string" && params.role.trim().length > 0;
    const hasSchoolFilter =
      typeof params.schoolId === "string" && params.schoolId.trim().length > 0;

    // Base query to get all users with their roles and schools
    const baseQuery = db
      .select({
        user: userProfile,
        role: roles,
        userRole: userRoles,
        school: schools,
      })
      .from(userProfile)
      .leftJoin(userRoles, eq(userProfile.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .leftJoin(schools, eq(userRoles.schoolId, schools.id));

    // Build where conditions
    const whereConditions: any[] = [];

    // Apply search filter if provided
    if (hasSearch) {
      const searchTerm = `%${params.search!.trim()}%`;
      whereConditions.push(
        or(
          ilike(userProfile.firstName, searchTerm),
          ilike(userProfile.lastName, searchTerm),
          ilike(userProfile.email, searchTerm)
        ) as any
      );
    }

    // Apply role filter if provided
    if (hasRoleFilter) {
      whereConditions.push(eq(roles.key, params.role!.trim()));
    }

    // Apply school filter if provided
    if (hasSchoolFilter) {
      whereConditions.push(eq(userRoles.schoolId, params.schoolId!));
    }

    const queryWithFilters =
      whereConditions.length > 0
        ? baseQuery.where(whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions))
        : baseQuery;

    // Order by user name and apply pagination
    const rows = await queryWithFilters
      .orderBy(asc(userProfile.firstName), asc(userProfile.lastName))
      .limit(params.limit)
      .offset(params.offset);

    // Group results by user
    const userMap = new Map<
      string,
      {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        avatarUrl: string | null;
        createdAt: string | null;
        updatedAt: string | null;
        metadata: any;
        platformRoles: string[];
        schoolRoles: Array<{
          schoolId: string;
          schoolName: string | null;
          roleKey: string | null;
          roleName: string | null;
        }>;
      }
    >();

    for (const row of rows) {
      const userId = row.user.id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: row.user.id,
          firstName: row.user.firstName,
          lastName: row.user.lastName,
          email: row.user.email,
          avatarUrl: row.user.avatarUrl,
          createdAt: row.user.createdAt,
          updatedAt: row.user.updatedAt,
          metadata: row.user.metadata,
          platformRoles: [],
          schoolRoles: [],
        });
      }

      const userData = userMap.get(userId)!;

      // Add platform roles
      if (
        row.role &&
        row.userRole?.roleScope === "platform" &&
        row.role.key &&
        !userData.platformRoles.includes(row.role.key)
      ) {
        userData.platformRoles.push(row.role.key);
      }

      // Add school roles
      if (
        row.role &&
        row.userRole?.roleScope === "school" &&
        row.userRole.schoolId &&
        row.school
      ) {
        const schoolRole = {
          schoolId: row.userRole.schoolId,
          schoolName: row.school.name,
          roleKey: row.role.key || null,
          roleName: row.role.name || null,
        };

        // Check if this school-role combination already exists
        const exists = userData.schoolRoles.some(
          (sr) =>
            sr.schoolId === schoolRole.schoolId &&
            sr.roleKey === schoolRole.roleKey
        );

        if (!exists) {
          userData.schoolRoles.push(schoolRole);
        }
      }
    }

    return Array.from(userMap.values());
  },
};
