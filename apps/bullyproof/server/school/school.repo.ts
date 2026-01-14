import { db } from "@/server/db/drizzle";
import {
  vSchoolsReadable,
  vSchoolsStatistics,
  schools,
  userRoles,
  roles,
} from "@/server/db/schema";
import { asc, desc, eq, ilike, inArray, sql, and } from "drizzle-orm";

export const schoolRepo = {
  getAll: () => db.select().from(vSchoolsReadable),

  getAllPaginated: async (params: {
    limit: number;
    offset: number;
    search?: string;
    schoolIds?: string[];
  }) => {
    const hasSearch =
      typeof params.search === "string" && params.search.trim().length > 0;
    const hasSchoolIdsFilter =
      Array.isArray(params.schoolIds) && params.schoolIds.length > 0;

    // Base query with statistics from v_schools_statistics view
    const baseQuery = db
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
        teacherCount:
          sql<number>`COALESCE(${vSchoolsStatistics.teacherCount}, 0)`.as(
            "teacher_count"
          ),
        classCount:
          sql<number>`COALESCE(${vSchoolsStatistics.classCount}, 0)`.as(
            "class_count"
          ),
        schoolAdminCount:
          sql<number>`COALESCE(${vSchoolsStatistics.schoolAdminCount}, 0)`.as(
            "school_admin_count"
          ),
        schoolLicenceCount:
          sql<number>`COALESCE(${vSchoolsStatistics.schoolLicenceCount}, 0)`.as(
            "school_licence_count"
          ),
        activeLicence:
          sql<boolean>`COALESCE(${vSchoolsStatistics.activeLicence}, false)`.as(
            "active_licence"
          ),
      })
      .from(vSchoolsReadable)
      .leftJoin(
        vSchoolsStatistics,
        eq(vSchoolsStatistics.id, vSchoolsReadable.id)
      );

    // Build where conditions
    const whereConditions = [];
    if (hasSearch) {
      whereConditions.push(
        ilike(vSchoolsReadable.name, `%${params.search!.trim()}%`)
      );
    }
    if (hasSchoolIdsFilter) {
      whereConditions.push(inArray(vSchoolsReadable.id, params.schoolIds!));
    }

    // Apply where conditions if any
    let queryWithWhere = baseQuery;
    if (whereConditions.length > 0) {
      queryWithWhere = baseQuery.where(
        whereConditions.length === 1
          ? whereConditions[0]
          : and(...whereConditions)
      ) as any;
    }

    if (!hasSearch) {
      const rows = await queryWithWhere
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
      const rows = await queryWithWhere
        .orderBy(desc(similarityExpr), asc(vSchoolsReadable.name))
        .limit(params.limit)
        .offset(params.offset);
      return rows;
    } catch {
      const rows = await queryWithWhere
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

  async create(data: { name: string; stateId: string; sectorId: string }) {
    const baseSlug = this.generateSlug(data.name);
    const uniqueSlug = await this.findUniqueSlug(baseSlug);

    const result = await db
      .insert(schools)
      .values({
        name: data.name,
        stateId: data.stateId,
        sectorId: data.sectorId,
        slug: uniqueSlug,
      })
      .returning();

    return result;
  },

  async update(
    schoolId: string,
    data: {
      name?: string;
      stateId?: string;
      sectorId?: string;
      emailDomain?: string | null;
      address?: string | null;
      bannerUrl?: string | null;
      avatarUrl?: string | null;
    }
  ) {
    const updateData: any = {};
    
    // If name is being updated, check if it actually changed
    if (data.name !== undefined) {
      // Fetch current school to compare names
      const currentSchool = await db
        .select({ name: schools.name })
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);
      
      const currentName = currentSchool[0]?.name;
      // Only regenerate slug if name actually changed
      if (currentName && currentName !== data.name) {
        const baseSlug = this.generateSlug(data.name);
        const uniqueSlug = await this.findUniqueSlug(baseSlug);
        updateData.slug = uniqueSlug;
      }
      updateData.name = data.name;
    }
    
    if (data.stateId !== undefined) updateData.stateId = data.stateId;
    if (data.sectorId !== undefined) updateData.sectorId = data.sectorId;
    if (data.emailDomain !== undefined) updateData.emailDomain = data.emailDomain;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.bannerUrl !== undefined) updateData.bannerUrl = data.bannerUrl;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const result = await db
      .update(schools)
      .set(updateData)
      .where(eq(schools.id, schoolId))
      .returning();

    return result[0] ?? null;
  },

  async delete(schoolId: string) {
    // Delete the school - CASCADE will handle related records
    const result = await db
      .delete(schools)
      .where(eq(schools.id, schoolId))
      .returning();
    
    return result[0] ?? null;
  },

  // Example: join table lookups can live here too (e.g., teacher_school_assignments)
  // getByTeacher: (teacherId: string) => db.select()...join(...).where(...)
};
