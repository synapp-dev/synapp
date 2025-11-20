import { db } from "@/server/db/drizzle";
import { vSchoolsReadable, schools, userRoles, roles } from "@/server/db/schema";
import { asc, desc, eq, ilike, inArray, sql, and } from "drizzle-orm";

export const schoolRepo = {
  getAll: () => db.select().from(vSchoolsReadable),

  getAllPaginated: async (params: {
    limit: number;
    offset: number;
    search?: string;
  }) => {
    const hasSearch =
      typeof params.search === "string" && params.search.trim().length > 0;

    // Get TEACHER role ID first
    const teacherRole = await db
      .select()
      .from(roles)
      .where(eq(roles.key, "TEACHER"))
      .limit(1);

    const teacherRoleId = teacherRole[0]?.id;

    // Base query with teacher count using LEFT JOIN
    const baseQuery = teacherRoleId
      ? db
          .select({
            id: vSchoolsReadable.id,
            name: vSchoolsReadable.name,
            code: vSchoolsReadable.code,
            stateId: vSchoolsReadable.stateId,
            sectorId: vSchoolsReadable.sectorId,
            emailDomain: vSchoolsReadable.emailDomain,
            address: vSchoolsReadable.address,
            joinedAt: vSchoolsReadable.joinedAt,
            createdAt: vSchoolsReadable.createdAt,
            slug: vSchoolsReadable.slug,
            bannerUrl: vSchoolsReadable.bannerUrl,
            avatarUrl: vSchoolsReadable.avatarUrl,
            state: vSchoolsReadable.state,
            sector: vSchoolsReadable.sector,
            levels: vSchoolsReadable.levels,
            teacherCount: sql<number>`COALESCE(COUNT(DISTINCT ${userRoles.userId}), 0)`.as("teacher_count"),
          })
          .from(vSchoolsReadable)
          .leftJoin(
            userRoles,
            and(
              eq(userRoles.schoolId, vSchoolsReadable.id),
              eq(userRoles.roleId, teacherRoleId)
            )
          )
          .groupBy(
            vSchoolsReadable.id,
            vSchoolsReadable.name,
            vSchoolsReadable.code,
            vSchoolsReadable.stateId,
            vSchoolsReadable.sectorId,
            vSchoolsReadable.emailDomain,
            vSchoolsReadable.address,
            vSchoolsReadable.joinedAt,
            vSchoolsReadable.createdAt,
            vSchoolsReadable.slug,
            vSchoolsReadable.bannerUrl,
            vSchoolsReadable.avatarUrl,
            vSchoolsReadable.state,
            vSchoolsReadable.sector,
            vSchoolsReadable.levels
          )
      : db
          .select({
            id: vSchoolsReadable.id,
            name: vSchoolsReadable.name,
            code: vSchoolsReadable.code,
            stateId: vSchoolsReadable.stateId,
            sectorId: vSchoolsReadable.sectorId,
            emailDomain: vSchoolsReadable.emailDomain,
            address: vSchoolsReadable.address,
            joinedAt: vSchoolsReadable.joinedAt,
            createdAt: vSchoolsReadable.createdAt,
            slug: vSchoolsReadable.slug,
            bannerUrl: vSchoolsReadable.bannerUrl,
            avatarUrl: vSchoolsReadable.avatarUrl,
            state: vSchoolsReadable.state,
            sector: vSchoolsReadable.sector,
            levels: vSchoolsReadable.levels,
            teacherCount: sql<number>`0`.as("teacher_count"),
          })
          .from(vSchoolsReadable);

    if (!hasSearch) {
      const rows = await baseQuery
        .orderBy(asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    }

    const q = params.search!.trim();

    // Try to use pg_trgm similarity() for fuzzy ranking if available.
    // Falls back to ILIKE and alphabetical order if similarity not installed.
    try {
      const similarityExpr = sql`similarity(${vSchoolsReadable.name}, ${q})`;
      const rows = await baseQuery
        .where(ilike(vSchoolsReadable.name, `%${q}%`) as any)
        .orderBy(desc(similarityExpr), asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    } catch {
      const rows = await baseQuery
        .where(ilike(vSchoolsReadable.name, `%${q}%`) as any)
        .orderBy(asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    }
  },

  getByIds: (ids: string[]) =>
    db.select().from(vSchoolsReadable).where(inArray(vSchoolsReadable.id, ids)),

  getBySlug: (slug: string) =>
    db
      .select()
      .from(vSchoolsReadable)
      .where(eq(vSchoolsReadable.slug, slug))
      .limit(1),

  generateSlug: (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .trim();
  },

  async findUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const existing = await db
        .select({ id: schools.id })
        .from(schools)
        .where(eq(schools.slug, slug))
        .limit(1);
      
      if (existing.length === 0) {
        return slug;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  },

  async create(data: {
    name: string;
    stateId: string;
    sectorId: string;
    emailDomain?: string;
    address?: string;
    bannerUrl?: string;
    avatarUrl?: string;
  }) {
    const baseSlug = this.generateSlug(data.name);
    const uniqueSlug = await this.findUniqueSlug(baseSlug);

    const result = await db
      .insert(schools)
      .values({
        name: data.name,
        stateId: data.stateId,
        sectorId: data.sectorId,
        emailDomain: data.emailDomain || null,
        address: data.address || null,
        bannerUrl: data.bannerUrl || null,
        avatarUrl: data.avatarUrl || null,
        slug: uniqueSlug,
      })
      .returning();

    return result;
  },

  // Example: join table lookups can live here too (e.g., teacher_school_assignments)
  // getByTeacher: (teacherId: string) => db.select()...join(...).where(...)
};
