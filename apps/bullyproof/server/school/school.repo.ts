import { db } from "@/server/db/drizzle";
import {
  vSchoolsReadable,
  vSchoolsStatistics,
  schools,
  lessons,
  userRoles,
  roles,
  userProfile,
  userSchoolPositions,
} from "@/server/db/schema";
import { asc, desc, eq, ilike, inArray, sql, and, or, count } from "drizzle-orm";

export const schoolRepo = {
  getAll: () => db.select().from(vSchoolsReadable),

  getAllPaginated: async (params: {
    limit: number;
    offset: number;
    search?: string;
    schoolIds?: string[];
    sort?: "latest";
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
        levelBadge: vSchoolsReadable.levelBadge,
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
        staffCount:
          sql<number>`COALESCE(${vSchoolsStatistics.staffCount}, 0)`.as(
            "staff_count"
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
      const latestSortExpr = sql`COALESCE(${vSchoolsReadable.joinedAt}, ${vSchoolsReadable.createdAt})`;
      const rows = await queryWithWhere
        .orderBy(
          params.sort === "latest"
            ? desc(latestSortExpr)
            : asc(vSchoolsReadable.name),
          asc(vSchoolsReadable.name)
        )
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

  getBySlug: async (slug: string) => {
    const rows = await db
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
        levelBadge: vSchoolsReadable.levelBadge,
        teacherCount:
          sql<number>`COALESCE(${vSchoolsStatistics.teacherCount}, 0)`.as(
            "teacher_count"
          ),
        classCount:
          sql<number>`COALESCE(${vSchoolsStatistics.classCount}, 0)`.as(
            "class_count"
          ),
        lessonCount:
          sql<number>`COALESCE(${vSchoolsStatistics.lessonCount}, 0)`.as(
            "lesson_count"
          ),
        schoolAdminCount:
          sql<number>`COALESCE(${vSchoolsStatistics.schoolAdminCount}, 0)`.as(
            "school_admin_count"
          ),
        schoolLicenceCount:
          sql<number>`COALESCE(${vSchoolsStatistics.schoolLicenceCount}, 0)`.as(
            "school_licence_count"
          ),
        staffCount:
          sql<number>`COALESCE(${vSchoolsStatistics.staffCount}, 0)`.as(
            "staff_count"
          ),
        activeLicence:
          sql<boolean>`COALESCE(${vSchoolsStatistics.activeLicence}, false)`.as(
            "active_licence"
          ),
      })
      .from(vSchoolsReadable)
      .leftJoin(vSchoolsStatistics, eq(vSchoolsStatistics.id, vSchoolsReadable.id))
      .where(eq(vSchoolsReadable.slug, slug))
      .limit(1);
    return rows;
  },

  getSchoolStats: async (schoolId: string) => {
    const [statsRow, schoolRow] = await Promise.all([
      db
        .select({
          teacherCount: vSchoolsStatistics.teacherCount,
          schoolAdminCount: vSchoolsStatistics.schoolAdminCount,
          staffCount: vSchoolsStatistics.staffCount,
          classCount: vSchoolsStatistics.classCount,
          lessonCount: vSchoolsStatistics.lessonCount,
        })
        .from(vSchoolsStatistics)
        .where(eq(vSchoolsStatistics.id, schoolId))
        .limit(1),
      db
        .select({
          joinedAt: schools.joinedAt,
          createdAt: schools.createdAt,
        })
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1),
    ]);

    const stats = statsRow[0];
    const school = schoolRow[0];

    // Days since joined (or created if no joined_at) - "days of being bully proof"
    let daysBullyProof = 0;
    let startDate: string | null = null;
    if (school) {
      const dateStr = school.joinedAt ?? school.createdAt;
      if (dateStr) {
        startDate = dateStr;
        const start = new Date(dateStr).getTime();
        const now = Date.now();
        daysBullyProof = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
      }
    }

    const teacherCount = Number(stats?.teacherCount ?? 0);
    const schoolAdminCount = Number(stats?.schoolAdminCount ?? 0);
    const staffCount = Number(stats?.staffCount ?? 0);
    // Total staff excluding licence: teachers + admins + staff (may slightly overcount users with multiple roles)
    const totalStaff = teacherCount + schoolAdminCount + staffCount;

    // Lessons completed = status 'completed' or 'feedback' only
    const completedLessonRows = await db
      .select({ count: count() })
      .from(lessons)
      .where(
        and(
          eq(lessons.schoolId, schoolId),
          inArray(lessons.status, ["completed", "feedback"])
        )
      );
    const completedLessonCount = Number(completedLessonRows[0]?.count ?? 0);

    return {
      daysBullyProof,
      startDate,
      teacherCount,
      totalStaff,
      classCount: Number(stats?.classCount ?? 0),
      completedLessonCount,
    };
  },

  getKeyStaff: async (schoolId: string) => {
    const adminRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.key, "SCHOOL_ADMIN"))
      .limit(1);
    const adminRoleId = adminRole[0]?.id;
    if (!adminRoleId) {
      return { admins: [], apStaff: [] };
    }

    const adminUserIds = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.schoolId, schoolId),
          eq(userRoles.roleId, adminRoleId)
        )
      );
    const adminIds = adminUserIds.map((r) => r.userId);

    const adminProfiles =
      adminIds.length > 0
        ? await db
            .select({
              id: userProfile.id,
              firstName: userProfile.firstName,
              lastName: userProfile.lastName,
              email: userProfile.email,
              avatarUrl: userProfile.avatarUrl,
            })
            .from(userProfile)
            .where(inArray(userProfile.id, adminIds))
        : [];

    const leadershipKeywords = [
      "%principal%",
      "%deputy%",
      "%head of%",
      "%head of %",
      "%hod%",
      "% ap %",
    ];
    const apPositions = await db
      .select({
        userId: userSchoolPositions.userId,
        position: userSchoolPositions.position,
      })
      .from(userSchoolPositions)
      .where(
        and(
          eq(userSchoolPositions.schoolId, schoolId),
          or(
            ...leadershipKeywords.map((k) =>
              ilike(userSchoolPositions.position, k)
            )
          )
        )
      );

    const apUserIds = [...new Set(apPositions.map((p) => p.userId))].filter(
      (id) => !adminIds.includes(id)
    );

    const apProfilesWithPositions: Array<{
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
      avatarUrl: string | null;
      positions: string[];
    }> = [];

    if (apUserIds.length > 0) {
      const profiles = await db
        .select({
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email,
          avatarUrl: userProfile.avatarUrl,
        })
        .from(userProfile)
        .where(inArray(userProfile.id, apUserIds));

      const positionMap = new Map<string, string[]>();
      for (const p of apPositions) {
        if (apUserIds.includes(p.userId)) {
          const arr = positionMap.get(p.userId) ?? [];
          arr.push(p.position);
          positionMap.set(p.userId, arr);
        }
      }

      for (const prof of profiles) {
        apProfilesWithPositions.push({
          ...prof,
          positions: positionMap.get(prof.id) ?? [],
        });
      }
    }

    const shuffled = apProfilesWithPositions.sort(() => Math.random() - 0.5);
    const apStaff = shuffled.slice(0, 6);

    return {
      admins: adminProfiles,
      apStaff,
    };
  },

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
    contentTypeId?: string;
  }) {
    const baseSlug = this.generateSlug(data.name);
    const uniqueSlug = await this.findUniqueSlug(baseSlug);

    const result = await db
      .insert(schools)
      .values({
        name: data.name,
        stateId: data.stateId,
        sectorId: data.sectorId,
        slug: uniqueSlug,
        contentTypeId:
          data.contentTypeId ??
          sql`(select id from content_types where is_default)`,
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
