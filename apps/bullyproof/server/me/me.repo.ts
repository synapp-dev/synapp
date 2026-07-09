import { db } from "@/server/db/drizzle";
import {
  vUserProfileExpanded,
  vSchoolsEnriched,
  userRoles,
  roles,
  schools,
} from "@/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

export const meRepo = {
  getProfileByUserId: (id: string) =>
    db
      .select()
      .from(vUserProfileExpanded)
      .where(eq(vUserProfileExpanded.id, id))
      .limit(1),

  getProfileByUserEmail: (email: string) =>
    db
      .select()
      .from(vUserProfileExpanded)
      .where(eq(vUserProfileExpanded.email, email))
      .limit(1),

  getAssignedSchoolsByUserId: async (userId: string, limit: number) => {
    // Get schools from user's school roles
    const userSchoolRoles = await db
      .select({ schoolId: userRoles.schoolId })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(eq(userRoles.userId, userId), eq(userRoles.roleScope, "school"))
      );

    const schoolIds = userSchoolRoles
      .map((role) => role.schoolId)
      .filter((id): id is string => id !== null);

    if (schoolIds.length === 0) {
      return [];
    }

    return db
      .select({
        id: vSchoolsEnriched.id,
        name: vSchoolsEnriched.name,
        code: vSchoolsEnriched.code,
        slug: vSchoolsEnriched.slug,
        emailDomain: vSchoolsEnriched.emailDomain,
        address: vSchoolsEnriched.address,
        joinedAt: vSchoolsEnriched.joinedAt,
        createdAt: vSchoolsEnriched.createdAt,
        state: vSchoolsEnriched.state,
        sector: vSchoolsEnriched.sector,
        levels: vSchoolsEnriched.levels,
        levelBadge: vSchoolsEnriched.levelBadge,
        bannerUrl: schools.bannerUrl,
        avatarUrl: schools.avatarUrl,
      })
      .from(vSchoolsEnriched)
      .leftJoin(schools, eq(schools.id, vSchoolsEnriched.id))
      .where(inArray(vSchoolsEnriched.id, schoolIds))
      .limit(limit);
  },
};
