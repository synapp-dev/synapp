import { db } from "@/server/db/drizzle";
import {
  classes,
  classYears,
  courseProgress,
  lessonClasses,
  lessonFeedback,
  lessons,
  roles,
  schoolCultureBenchmarks,
  schoolCultureComparativePeriods,
  schoolLevelAssignments,
  schoolLevels,
  schoolLicences,
  schoolSectors,
  schoolYears,
  schools,
  states,
  topics,
  userProfile,
  userRoles,
} from "@/server/db/schema";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";

/** One row per school for the all-schools register export. */
export type SchoolRegisterRow = {
  schoolId: string;
  name: string;
  stateCode: string | null;
  sector: string | null;
  levels: string | null;
  licenceStatus: string | null;
  staffCount: number;
  teacherCount: number;
  classCount: number;
  lessonsTotal: number;
  lessonsCompleted: number;
  apCertifiedCount: number;
  hasCultureBenchmark: boolean;
  lastLessonAt: string | null;
};

export const reportExportPackRepo = {
  async getSchoolsRegister(params: {
    certificationCourseId: string | null;
  }): Promise<SchoolRegisterRow[]> {
    const schoolRows = await db
      .select({
        id: schools.id,
        name: schools.name,
        stateCode: states.code,
        sector: schoolSectors.name,
      })
      .from(schools)
      .leftJoin(states, eq(states.id, schools.stateId))
      .leftJoin(schoolSectors, eq(schoolSectors.id, schools.sectorId))
      .orderBy(schools.name);

    const [levelRows, licenceRows, roleRows, classRows, lessonRows, cultureRows] =
      await Promise.all([
        db
          .select({
            schoolId: schoolLevelAssignments.schoolId,
            levelName: schoolLevels.name,
          })
          .from(schoolLevelAssignments)
          .innerJoin(
            schoolLevels,
            eq(schoolLevels.id, schoolLevelAssignments.levelId)
          ),
        db
          .select({
            schoolId: schoolLicences.schoolId,
            status: schoolLicences.status,
            startsAt: schoolLicences.startsAt,
          })
          .from(schoolLicences),
        db
          .select({
            schoolId: userRoles.schoolId,
            roleKey: roles.key,
            count: sql<number>`count(distinct ${userRoles.userId})::int`,
          })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(eq(userRoles.roleScope, "school"))
          .groupBy(userRoles.schoolId, roles.key),
        db
          .select({
            schoolId: classes.schoolId,
            count: sql<number>`count(*)::int`,
          })
          .from(classes)
          .where(eq(classes.active, true))
          .groupBy(classes.schoolId),
        db
          .select({
            schoolId: lessons.schoolId,
            total: sql<number>`count(*)::int`,
            completed: sql<number>`count(*) filter (where ${lessons.status} = 'completed')::int`,
            lastAt: sql<string | null>`max(${lessons.createdAt})`,
          })
          .from(lessons)
          .groupBy(lessons.schoolId),
        db
          .select({ schoolId: schoolCultureBenchmarks.schoolId })
          .from(schoolCultureBenchmarks),
      ]);

    // AP certified per school: distinct completed users holding a TEACHER role there
    const certRows = params.certificationCourseId
      ? await db
          .select({
            schoolId: userRoles.schoolId,
            count: sql<number>`count(distinct ${courseProgress.userId})::int`,
          })
          .from(courseProgress)
          .innerJoin(userRoles, eq(userRoles.userId, courseProgress.userId))
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(
            and(
              eq(courseProgress.courseId, params.certificationCourseId),
              or(
                eq(courseProgress.status, "completed"),
                gte(courseProgress.progressPercentage, 100)
              ),
              eq(roles.key, "TEACHER")
            )
          )
          .groupBy(userRoles.schoolId)
      : [];

    const levelsBySchool = new Map<string, string[]>();
    for (const row of levelRows) {
      const list = levelsBySchool.get(row.schoolId) ?? [];
      list.push(row.levelName);
      levelsBySchool.set(row.schoolId, list);
    }
    // Prefer an ACTIVE licence; otherwise the most recent one
    const licenceBySchool = new Map<string, string>();
    for (const row of licenceRows) {
      const existing = licenceBySchool.get(row.schoolId);
      if (!existing || row.status === "ACTIVE") {
        licenceBySchool.set(row.schoolId, row.status);
      }
    }
    const staffBySchool = new Map<string, number>();
    const teachersBySchool = new Map<string, number>();
    for (const row of roleRows) {
      if (!row.schoolId) continue;
      staffBySchool.set(
        row.schoolId,
        (staffBySchool.get(row.schoolId) ?? 0) + Number(row.count)
      );
      if (row.roleKey === "TEACHER") {
        teachersBySchool.set(row.schoolId, Number(row.count));
      }
    }
    const classesBySchool = new Map(
      classRows.map((r) => [r.schoolId, Number(r.count)] as const)
    );
    const lessonsBySchool = new Map(
      lessonRows.map(
        (r) =>
          [
            r.schoolId,
            {
              total: Number(r.total),
              completed: Number(r.completed),
              lastAt: r.lastAt,
            },
          ] as const
      )
    );
    const cultureSchools = new Set(cultureRows.map((r) => r.schoolId));
    const certBySchool = new Map<string, number>();
    for (const row of certRows) {
      if (row.schoolId) certBySchool.set(row.schoolId, Number(row.count));
    }

    return schoolRows.map((school) => ({
      schoolId: school.id,
      name: school.name,
      stateCode: school.stateCode,
      sector: school.sector,
      levels: levelsBySchool.get(school.id)?.join(", ") ?? null,
      licenceStatus: licenceBySchool.get(school.id) ?? null,
      staffCount: staffBySchool.get(school.id) ?? 0,
      teacherCount: teachersBySchool.get(school.id) ?? 0,
      classCount: classesBySchool.get(school.id) ?? 0,
      lessonsTotal: lessonsBySchool.get(school.id)?.total ?? 0,
      lessonsCompleted: lessonsBySchool.get(school.id)?.completed ?? 0,
      apCertifiedCount: certBySchool.get(school.id) ?? 0,
      hasCultureBenchmark: cultureSchools.has(school.id),
      lastLessonAt: lessonsBySchool.get(school.id)?.lastAt ?? null,
    }));
  },

  /** Class rows for one school, with year levels and lesson completion counts. */
  async getClassRows(schoolId: string) {
    const classList = await db
      .select({
        id: classes.id,
        name: classes.name,
        studentCap: classes.studentCap,
        active: classes.active,
      })
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(classes.name);

    const classIds = classList.map((c) => c.id);
    if (classIds.length === 0) return [];

    const [yearRows, lessonRows] = await Promise.all([
      db
        .select({
          classId: classYears.classId,
          yearName: schoolYears.displayName,
          sortIndex: schoolYears.sortIndex,
        })
        .from(classYears)
        .innerJoin(schoolYears, eq(schoolYears.id, classYears.schoolYearId))
        .where(inArray(classYears.classId, classIds)),
      db
        .select({
          classId: lessonClasses.classId,
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where ${lessons.status} = 'completed')::int`,
          lastAt: sql<string | null>`max(${lessons.createdAt})`,
        })
        .from(lessonClasses)
        .innerJoin(lessons, eq(lessons.id, lessonClasses.lessonId))
        .where(inArray(lessonClasses.classId, classIds))
        .groupBy(lessonClasses.classId),
    ]);

    const yearsByClass = new Map<string, Array<{ name: string; sort: number }>>();
    for (const row of yearRows) {
      const list = yearsByClass.get(row.classId) ?? [];
      list.push({ name: row.yearName, sort: row.sortIndex });
      yearsByClass.set(row.classId, list);
    }
    const lessonsByClass = new Map(
      lessonRows.map((r) => [r.classId, r] as const)
    );

    return classList.map((cls) => ({
      name: cls.name,
      yearLevels:
        yearsByClass
          .get(cls.id)
          ?.sort((a, b) => a.sort - b.sort)
          .map((y) => y.name)
          .join(", ") ?? "",
      studentNumbers: cls.studentCap ?? null,
      active: cls.active,
      lessonsTotal: Number(lessonsByClass.get(cls.id)?.total ?? 0),
      lessonsCompleted: Number(lessonsByClass.get(cls.id)?.completed ?? 0),
      lastLessonAt: lessonsByClass.get(cls.id)?.lastAt ?? null,
    }));
  },

  /** Staff rows for one school: profile, access levels, AP status, last active. */
  async getStaffRows(schoolId: string, certificationCourseId: string | null) {
    const roleRows = await db
      .select({
        userId: userRoles.userId,
        roleKey: roles.key,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        lastSeenAt: userProfile.lastSeenAt,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .innerJoin(userProfile, eq(userProfile.id, userRoles.userId))
      .where(
        and(eq(userRoles.schoolId, schoolId), eq(userRoles.roleScope, "school"))
      );

    const byUser = new Map<
      string,
      {
        name: string;
        email: string;
        roleKeys: string[];
        lastSeenAt: string | null;
      }
    >();
    for (const row of roleRows) {
      const existing = byUser.get(row.userId);
      if (existing) {
        existing.roleKeys.push(row.roleKey);
      } else {
        byUser.set(row.userId, {
          name:
            [row.firstName, row.lastName].filter(Boolean).join(" ") ||
            row.email,
          email: row.email,
          roleKeys: [row.roleKey],
          lastSeenAt: row.lastSeenAt,
        });
      }
    }

    const userIds = [...byUser.keys()];
    const certUsers = new Set<string>();
    if (certificationCourseId && userIds.length > 0) {
      const certRows = await db
        .select({ userId: courseProgress.userId })
        .from(courseProgress)
        .where(
          and(
            eq(courseProgress.courseId, certificationCourseId),
            inArray(courseProgress.userId, userIds),
            or(
              eq(courseProgress.status, "completed"),
              gte(courseProgress.progressPercentage, 100)
            )
          )
        );
      for (const row of certRows) certUsers.add(row.userId);
    }

    return [...byUser.entries()]
      .map(([userId, user]) => ({
        name: user.name,
        email: user.email,
        roleKeys: user.roleKeys,
        apCertified: certUsers.has(userId),
        lastSeenAt: user.lastSeenAt,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Full lesson history for a school (optionally one creator only). */
  async getLessonHistoryRows(schoolId: string, createdByUserId?: string) {
    const filters = [eq(lessons.schoolId, schoolId)];
    if (createdByUserId) {
      filters.push(eq(lessons.createdByUserId, createdByUserId));
    }
    const lessonRows = await db
      .select({
        id: lessons.id,
        topicTitle: topics.title,
        status: lessons.status,
        scheduledFor: lessons.scheduledFor,
        createdAt: lessons.createdAt,
        teacherFirstName: userProfile.firstName,
        teacherLastName: userProfile.lastName,
        teacherEmail: userProfile.email,
      })
      .from(lessons)
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .leftJoin(userProfile, eq(userProfile.id, lessons.createdByUserId))
      .where(and(...filters))
      .orderBy(desc(lessons.createdAt));

    const lessonIds = lessonRows.map((l) => l.id);
    if (lessonIds.length === 0) return [];

    const [classRows, ratingRows] = await Promise.all([
      db
        .select({
          lessonId: lessonClasses.lessonId,
          className: classes.name,
        })
        .from(lessonClasses)
        .innerJoin(classes, eq(classes.id, lessonClasses.classId))
        .where(inArray(lessonClasses.lessonId, lessonIds)),
      db
        .select({
          lessonId: lessonFeedback.lessonId,
          rating: sql<number>`avg(${lessonFeedback.rating})::float`,
        })
        .from(lessonFeedback)
        .where(inArray(lessonFeedback.lessonId, lessonIds))
        .groupBy(lessonFeedback.lessonId),
    ]);

    const classesByLesson = new Map<string, string[]>();
    for (const row of classRows) {
      const list = classesByLesson.get(row.lessonId) ?? [];
      list.push(row.className);
      classesByLesson.set(row.lessonId, list);
    }
    const ratingByLesson = new Map(
      ratingRows.map((r) => [r.lessonId, Number(r.rating)] as const)
    );

    return lessonRows.map((lesson) => ({
      topicTitle: lesson.topicTitle,
      classNames: classesByLesson.get(lesson.id)?.join(", ") ?? "",
      teacher:
        [lesson.teacherFirstName, lesson.teacherLastName]
          .filter(Boolean)
          .join(" ") ||
        lesson.teacherEmail ||
        "",
      status: lesson.status,
      scheduledFor: lesson.scheduledFor,
      createdAt: lesson.createdAt,
      rating: ratingByLesson.get(lesson.id) ?? null,
    }));
  },

  /** Culture benchmark + comparative periods for a school, metrics included. */
  async getCulturePeriods(schoolId: string) {
    const [benchmarks, comparatives] = await Promise.all([
      db
        .select()
        .from(schoolCultureBenchmarks)
        .where(eq(schoolCultureBenchmarks.schoolId, schoolId)),
      db
        .select()
        .from(schoolCultureComparativePeriods)
        .where(eq(schoolCultureComparativePeriods.schoolId, schoolId))
        .orderBy(schoolCultureComparativePeriods.periodStart),
    ]);
    return { benchmark: benchmarks[0] ?? null, comparatives };
  },

  /** All culture benchmark/comparative counts + latest headline per school. */
  async getCultureSummaryRows() {
    const [benchmarks, comparatives, schoolNames] = await Promise.all([
      db.select().from(schoolCultureBenchmarks),
      db
        .select()
        .from(schoolCultureComparativePeriods)
        .orderBy(schoolCultureComparativePeriods.periodStart),
      db.select({ id: schools.id, name: schools.name }).from(schools),
    ]);
    const nameById = new Map(schoolNames.map((s) => [s.id, s.name] as const));
    return { benchmarks, comparatives, nameById };
  },

  /** The caller's own certification progress rows. */
  async getOwnCertificationRows(userId: string) {
    return db
      .select({
        courseId: courseProgress.courseId,
        completedTopics: courseProgress.completedTopics,
        totalTopics: courseProgress.totalTopics,
        progressPercentage: courseProgress.progressPercentage,
        status: courseProgress.status,
        completedAt: courseProgress.completedAt,
      })
      .from(courseProgress)
      .where(eq(courseProgress.userId, userId));
  },
};
