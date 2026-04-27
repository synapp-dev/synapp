import { db } from "@/server/db/drizzle";
import {
  classes,
  courseProgress,
  lessonClasses,
  lessonFeedback,
  lessons,
  roles,
  schools,
  schoolLicences,
  topics,
  userProfile,
  userRoles,
} from "@/server/db/schema";
import { permissionTemplatesService } from "@/server/permission-templates/permission-templates.service";
import { and, asc, desc, eq, gte, inArray, or, sql } from "drizzle-orm";

function daysSinceUtcDateOnly(startsAt: string): number | null {
  const parts = startsAt.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const startUtc = Date.UTC(y, m - 1, d);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayUtc - startUtc) / 86400000);
}

export type AdminReportsIdleSchoolActivationStatus =
  | "locked"
  | "certification"
  | "active";

export type AdminReportsIdleOnboardingSchoolRow = {
  id: string;
  name: string;
  slug: string | null;
  /** Permission-template state: full unlock, certification unlock, or locked. */
  activationStatus: AdminReportsIdleSchoolActivationStatus;
  daysSinceActiveLicenceStart: number | null;
  classCount: number;
  teacherCount: number;
};

export type AdminReportsRecentLessonRow = {
  lessonId: string;
  topicTitle: string;
  classNames: string | null;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  schoolId: string;
  schoolName: string;
  schoolSlug: string | null;
  scheduledFor: string | null;
  createdAt: string;
  status: string;
};

export type AdminReportsOverview = {
  scope: "platform" | "school";
  schoolId: string | null;
  schoolsTotal: number;
  schoolsWithActiveLicence: number;
  lessonsTotal: number;
  lessonRatingsTotal: number;
  certificationsCompletedTotal: number;
  idleActiveSchoolsCount: number | null;
  idleSchools: AdminReportsIdleOnboardingSchoolRow[];
  recentLessons: AdminReportsRecentLessonRow[];
};

export const adminReportsRepo = {
  async getOverview(params: {
    schoolId?: string | null;
    certificationCourseId: string | null;
  }): Promise<AdminReportsOverview> {
    const schoolId = params.schoolId?.trim() || null;
    const scope = schoolId ? "school" : "platform";

    const schoolFilter = schoolId ? eq(schools.id, schoolId) : undefined;
    const lessonSchoolFilter = schoolId ? eq(lessons.schoolId, schoolId) : undefined;

    const [schoolsTotalRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(schools)
      .where(schoolFilter ?? sql`true`);

    const [licensedRow] = await db
      .select({
        c: sql<number>`count(distinct ${schoolLicences.schoolId})::int`,
      })
      .from(schoolLicences)
      .where(
        and(
          eq(schoolLicences.status, "ACTIVE"),
          schoolId ? eq(schoolLicences.schoolId, schoolId) : sql`true`
        )
      );

    const [lessonsRow] = await db
      .select({ c: sql<number>`count(${lessons.id})::int` })
      .from(lessons)
      .where(lessonSchoolFilter ?? sql`true`);

    const [ratingsRow] = await db
      .select({ c: sql<number>`count(${lessonFeedback.id})::int` })
      .from(lessonFeedback)
      .innerJoin(lessons, eq(lessonFeedback.lessonId, lessons.id))
      .where(lessonSchoolFilter ?? sql`true`);

    let certificationsCompletedTotal = 0;
    if (params.certificationCourseId) {
      const certCond = and(
        eq(courseProgress.courseId, params.certificationCourseId),
        or(
          eq(courseProgress.status, "completed"),
          gte(courseProgress.progressPercentage, 100)
        )
      );

      if (schoolId) {
        const [certRow] = await db
          .select({
            c: sql<number>`count(distinct ${courseProgress.userId})::int`,
          })
          .from(courseProgress)
          .innerJoin(userRoles, eq(userRoles.userId, courseProgress.userId))
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(
            and(certCond, eq(roles.key, "TEACHER"), eq(userRoles.schoolId, schoolId))
          );
        certificationsCompletedTotal = Number(certRow?.c ?? 0);
      } else {
        const [certRow] = await db
          .select({ c: sql<number>`count(*)::int` })
          .from(courseProgress)
          .where(certCond);
        certificationsCompletedTotal = Number(certRow?.c ?? 0);
      }
    }

    let idleActiveSchoolsCount: number | null = null;
    let idleSchools: AdminReportsIdleOnboardingSchoolRow[] = [];

    if (!schoolId) {
      const activeSchoolRows = await db
        .selectDistinct({ schoolId: schoolLicences.schoolId })
        .from(schoolLicences)
        .where(eq(schoolLicences.status, "ACTIVE"));

      const schoolsWithLessonsRows = await db
        .selectDistinct({ schoolId: lessons.schoolId })
        .from(lessons);

      const activeSet = new Set(
        activeSchoolRows.map((r) => r.schoolId).filter(Boolean) as string[]
      );
      const schoolsWithLessonsSet = new Set(
        schoolsWithLessonsRows.map((r) => r.schoolId)
      );

      const idleIds = [...activeSet].filter((id) => !schoolsWithLessonsSet.has(id));
      idleActiveSchoolsCount = idleIds.length;

      if (idleIds.length > 0) {
        const licenceRows = await db
          .select({
            schoolId: schoolLicences.schoolId,
            startsAt: schoolLicences.startsAt,
          })
          .from(schoolLicences)
          .where(
            and(
              eq(schoolLicences.status, "ACTIVE"),
              inArray(schoolLicences.schoolId, idleIds)
            )
          );

        const startsAtBySchool = new Map(
          licenceRows.map((r) => [r.schoolId, r.startsAt] as const)
        );

        const classAgg = await db
          .select({
            schoolId: classes.schoolId,
            c: sql<number>`count(*)::int`,
          })
          .from(classes)
          .where(inArray(classes.schoolId, idleIds))
          .groupBy(classes.schoolId);

        const classCountBySchool = new Map(
          classAgg.map((r) => [r.schoolId, Number(r.c ?? 0)] as const)
        );

        const teacherAgg = await db
          .select({
            schoolId: userRoles.schoolId,
            c: sql<number>`count(*)::int`,
          })
          .from(userRoles)
          .innerJoin(roles, eq(roles.id, userRoles.roleId))
          .where(
            and(inArray(userRoles.schoolId, idleIds), eq(roles.key, "TEACHER"))
          )
          .groupBy(userRoles.schoolId);

        const teacherCountBySchool = new Map(
          teacherAgg.map((r) => [r.schoolId!, Number(r.c ?? 0)] as const)
        );

        const fullUnlockBySchoolId =
          await permissionTemplatesService.getFullSchoolUnlockActiveBySchoolIds(
            idleIds
          );
        const certificationUnlockBySchoolId =
          await permissionTemplatesService.getCertificationUnlockActiveBySchoolIds(
            idleIds
          );

        const schoolRows = await db
          .select({
            id: schools.id,
            name: schools.name,
            slug: schools.slug,
          })
          .from(schools)
          .where(inArray(schools.id, idleIds))
          .orderBy(asc(schools.name));

        idleSchools = schoolRows.map((s) => {
          const startsAt = startsAtBySchool.get(s.id);
          const days =
            typeof startsAt === "string"
              ? daysSinceUtcDateOnly(startsAt)
              : null;
          const isActive = fullUnlockBySchoolId[s.id] ?? false;
          const isCertification = certificationUnlockBySchoolId[s.id] ?? false;
          const activationStatus: AdminReportsIdleSchoolActivationStatus =
            isActive
              ? "active"
              : isCertification
                ? "certification"
                : "locked";
          return {
            id: s.id,
            name: s.name,
            slug: s.slug,
            activationStatus,
            daysSinceActiveLicenceStart: days,
            classCount: classCountBySchool.get(s.id) ?? 0,
            teacherCount: teacherCountBySchool.get(s.id) ?? 0,
          };
        });
      }
    }

    const lessonRows = await db
      .select({
        lessonId: lessons.id,
        topicTitle: topics.title,
        schoolId: schools.id,
        schoolName: schools.name,
        schoolSlug: schools.slug,
        teacherFirstName: userProfile.firstName,
        teacherLastName: userProfile.lastName,
        scheduledFor: lessons.scheduledFor,
        createdAt: lessons.createdAt,
        status: lessons.status,
      })
      .from(lessons)
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .innerJoin(schools, eq(schools.id, lessons.schoolId))
      .leftJoin(userProfile, eq(userProfile.id, lessons.createdByUserId))
      .where(lessonSchoolFilter ?? sql`true`)
      .orderBy(desc(sql`coalesce(${lessons.scheduledFor}, ${lessons.createdAt})`));

    const lessonIds = lessonRows.map((r) => r.lessonId);
    const classNamesByLessonId = new Map<string, string>();

    if (lessonIds.length > 0) {
      const aggRows = await db
        .select({
          lessonId: lessonClasses.lessonId,
          names: sql<string>`string_agg(${classes.name}, ', ' ORDER BY ${classes.name})`,
        })
        .from(lessonClasses)
        .innerJoin(classes, eq(classes.id, lessonClasses.classId))
        .where(inArray(lessonClasses.lessonId, lessonIds))
        .groupBy(lessonClasses.lessonId);

      for (const row of aggRows) {
        classNamesByLessonId.set(row.lessonId, row.names);
      }
    }

    const recentLessons: AdminReportsRecentLessonRow[] = lessonRows.map((r) => ({
      ...r,
      classNames: classNamesByLessonId.get(r.lessonId) ?? null,
    }));

    return {
      scope,
      schoolId,
      schoolsTotal: Number(schoolsTotalRow?.c ?? 0),
      schoolsWithActiveLicence: Number(licensedRow?.c ?? 0),
      lessonsTotal: Number(lessonsRow?.c ?? 0),
      lessonRatingsTotal: Number(ratingsRow?.c ?? 0),
      certificationsCompletedTotal,
      idleActiveSchoolsCount,
      idleSchools,
      recentLessons,
    };
  },
};
