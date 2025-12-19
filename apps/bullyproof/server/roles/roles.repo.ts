import { db } from "@/server/db/drizzle";
import { roles, userRoles, userProfile, schools } from "@/server/db/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

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

  assignRole: (data: {
    userId: string;
    roleId: string;
    schoolId?: string;
    roleScope?: string;
  }) =>
    db
      .insert(userRoles)
      .values({
        ...data,
        roleScope:
          data.roleScope || (data.schoolId ? "school" : "platform"),
      })
      .returning(),

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
