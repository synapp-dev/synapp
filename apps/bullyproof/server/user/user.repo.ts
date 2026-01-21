import { db } from "@/server/db/drizzle";
import { vUsersWithRolesAndSchools } from "@/drizzle/schema";
import { asc, sql, ilike, or, and } from "drizzle-orm";

export const userRepo = {
  getAllUsersWithRolesAndSchools: async (params: {
    limit: number;
    offset: number;
    search?: string;
    role?: string;
    schoolId?: string;
  }) => {
    // Build where conditions for filtering
    const whereConditions: any[] = [];

    // Search filter: firstName, lastName, or email
    if (params.search && params.search.trim().length > 0) {
      const searchTerm = `%${params.search.trim()}%`;
      whereConditions.push(
        or(
          ilike(vUsersWithRolesAndSchools.firstName, searchTerm),
          ilike(vUsersWithRolesAndSchools.lastName, searchTerm),
          ilike(vUsersWithRolesAndSchools.email, searchTerm)
        ) as any
      );
    }

    // Role filter: check platformRoles array or schoolRoles JSONB
    // Special case: "__NONE__" means users with no roles at all
    if (params.role && params.role.trim().length > 0) {
      const roleKey = params.role.trim();
      if (roleKey === "__NONE__") {
        // Filter for users with no platform roles and no school roles
        // The view uses COALESCE so arrays are never NULL, just empty arrays
        // array_length returns NULL for empty arrays, jsonb_array_length returns 0 for empty arrays
        whereConditions.push(
          sql`array_length(${vUsersWithRolesAndSchools.platformRoles}, 1) IS NULL AND jsonb_array_length(${vUsersWithRolesAndSchools.schoolRoles}) = 0`
        );
      } else {
        // Normal role filter
        whereConditions.push(
          sql`(${vUsersWithRolesAndSchools.platformRoles} @> ARRAY[${roleKey}]::text[] OR EXISTS (
            SELECT 1 FROM jsonb_array_elements(${vUsersWithRolesAndSchools.schoolRoles}) AS role
            WHERE role->>'roleKey' = ${roleKey}
          ))`
        );
      }
    }

    // School filter: check schoolRoles JSONB
    if (params.schoolId && params.schoolId.trim().length > 0) {
      const schoolId = params.schoolId.trim();
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM jsonb_array_elements(${vUsersWithRolesAndSchools.schoolRoles}) AS role
          WHERE role->>'schoolId' = ${schoolId}
        )`
      );
    }

    // Build base query
    const baseQuery = db.select().from(vUsersWithRolesAndSchools);
    const queryWithFilters =
      whereConditions.length > 0
        ? baseQuery.where(
            whereConditions.length === 1
              ? whereConditions[0]
              : and(...whereConditions)
          )
        : baseQuery;

    // Get total count with filters
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(vUsersWithRolesAndSchools);
    const countQueryWithFilters =
      whereConditions.length > 0
        ? countQuery.where(
            whereConditions.length === 1
              ? whereConditions[0]
              : and(...whereConditions)
          )
        : countQuery;
    
    const countResult = await countQueryWithFilters;
    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated users from the view with filters
    const users = await queryWithFilters
      .orderBy(
        asc(vUsersWithRolesAndSchools.firstName),
        asc(vUsersWithRolesAndSchools.lastName)
      )
      .limit(params.limit)
      .offset(params.offset);

    // Transform the results - the view returns platformRoles as text[] and schoolRoles as jsonb
    const transformedUsers = users.map((user) => {
      // Parse schoolRoles JSONB array
      let schoolRoles: Array<{
        schoolId: string;
        schoolName: string | null;
        roleKey: string | null;
        roleName: string | null;
      }> = [];

      if (user.schoolRoles && typeof user.schoolRoles === "string") {
        try {
          const parsed = JSON.parse(user.schoolRoles);
          schoolRoles = Array.isArray(parsed) ? parsed : [];
        } catch {
          schoolRoles = [];
        }
      } else if (Array.isArray(user.schoolRoles)) {
        schoolRoles = user.schoolRoles;
      }

      // Parse platformRoles text array
      let platformRoles: string[] = [];
      if (Array.isArray(user.platformRoles)) {
        platformRoles = user.platformRoles;
      } else if (typeof user.platformRoles === "string") {
        try {
          platformRoles = JSON.parse(user.platformRoles);
        } catch {
          // Handle PostgreSQL array format
          platformRoles = user.platformRoles
            .replace(/[{}"]/g, "")
            .split(",")
            .filter((r) => r.trim().length > 0);
        }
      }

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        metadata: user.metadata,
        platformRoles,
        schoolRoles,
      };
    });

    return {
      users: transformedUsers,
      totalCount,
    };
  },
};
