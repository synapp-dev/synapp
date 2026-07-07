import { assertFeature } from "@/server/features/features.service";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import { getUserScopedRoles, hasPlatformRole } from "@/server/auth/rbac";
import { resolveSchoolRef } from "@/server/school/resolve-school-ref";
import {
  compareToBenchmark,
  cultureRatingInputMetricsSchema,
} from "@/server/culture-ratings/culture-rating-metrics";
import { db } from "@/server/db/drizzle";
import { certificationCourses, schools } from "@/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import { reportExportPackRepo } from "./report-export-pack.repo";

const AMAYDA_SLUG = "amayda-program";

type AuthContext = {
  userId: string | null;
};

/** Mirrors the client ExportTable shape (lib/report-export.ts). */
export type ExportPackTable = {
  title: string;
  rows: Array<Record<string, string | number | null>>;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseMetrics(raw: unknown) {
  const parsed = cultureRatingInputMetricsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

async function getAmaydaCourseId(): Promise<string | null> {
  const rows = await certificationCoursesRepo.getCourseBySlug(AMAYDA_SLUG);
  return rows[0]?.id ?? null;
}

async function buildSchoolPackTables(
  schoolId: string,
  certificationCourseId: string | null
): Promise<ExportPackTable[]> {
  const [classRows, staffRows, lessonRows, culture] = await Promise.all([
    reportExportPackRepo.getClassRows(schoolId),
    reportExportPackRepo.getStaffRows(schoolId, certificationCourseId),
    reportExportPackRepo.getLessonHistoryRows(schoolId),
    reportExportPackRepo.getCulturePeriods(schoolId),
  ]);

  const benchmarkMetrics = culture.benchmark
    ? parseMetrics(culture.benchmark.metrics)
    : null;

  const cultureRows: ExportPackTable["rows"] = [];
  if (culture.benchmark) {
    cultureRows.push({
      Period: "Benchmark",
      From: formatDate(culture.benchmark.periodStart),
      To: formatDate(culture.benchmark.periodEnd),
      "Culture %": null,
    });
  }
  for (const period of culture.comparatives) {
    const comparativeMetrics = parseMetrics(period.metrics);
    const headline =
      benchmarkMetrics && comparativeMetrics
        ? compareToBenchmark(benchmarkMetrics, comparativeMetrics)
            .cultureRatingPercent
        : null;
    cultureRows.push({
      Period: "Comparative",
      From: formatDate(period.periodStart),
      To: formatDate(period.periodEnd),
      "Culture %": headline == null ? null : Math.round(headline * 10) / 10,
    });
  }

  return [
    {
      title: "Classes",
      rows: classRows.map((row) => ({
        Class: row.name,
        "Year levels": row.yearLevels,
        "Student numbers": row.studentNumbers,
        Active: row.active ? "Yes" : "No",
        "Lessons delivered": row.lessonsTotal,
        "Lessons completed": row.lessonsCompleted,
        "Last lesson": formatDate(row.lastLessonAt),
      })),
    },
    {
      title: "Staff",
      rows: staffRows.map((row) => ({
        Name: row.name,
        Email: row.email,
        "Access levels": row.roleKeys
          .map((key) =>
            key === "TEACHER"
              ? "AP Teacher"
              : key === "SCHOOL_ADMIN"
                ? "School Admin"
                : key === "SCHOOL_LICENCE"
                  ? "School Licence"
                  : "Staff"
          )
          .join(", "),
        "AP certified": row.apCertified ? "Yes" : "No",
        "Last active": formatDate(row.lastSeenAt),
      })),
    },
    {
      title: "Lesson history",
      rows: lessonRows.map((row) => ({
        Lesson: row.topicTitle,
        Classes: row.classNames,
        Teacher: row.teacher,
        Status: row.status,
        Date: formatDate(row.scheduledFor ?? row.createdAt),
        Rating: row.rating == null ? null : Math.round(row.rating * 10) / 10,
      })),
    },
    { title: "Culture rating periods", rows: cultureRows },
  ];
}

export const reportExportPackService = {
  /** Bullyproof admin pack: schools register + culture (all schools) or one school's pack. */
  async getAdminExportPack(
    ctx: AuthContext,
    params: { schoolId?: string | null }
  ): Promise<{ tables: ExportPackTable[] }> {
    await assertFeature(ctx, "/admin/reports");
    const certificationCourseId = await getAmaydaCourseId();

    if (params.schoolId) {
      const tables = await buildSchoolPackTables(
        params.schoolId,
        certificationCourseId
      );
      return { tables };
    }

    const [register, culture] = await Promise.all([
      reportExportPackRepo.getSchoolsRegister({ certificationCourseId }),
      reportExportPackRepo.getCultureSummaryRows(),
    ]);

    const benchmarkBySchool = new Map(
      culture.benchmarks.map((b) => [b.schoolId, b] as const)
    );
    const latestComparativeBySchool = new Map<
      string,
      (typeof culture.comparatives)[number]
    >();
    for (const period of culture.comparatives) {
      latestComparativeBySchool.set(period.schoolId, period);
    }

    const cultureSummaryRows: ExportPackTable["rows"] = [];
    for (const [schoolId, benchmark] of benchmarkBySchool) {
      const latest = latestComparativeBySchool.get(schoolId);
      const benchmarkMetrics = parseMetrics(benchmark.metrics);
      const latestMetrics = latest ? parseMetrics(latest.metrics) : null;
      const headline =
        benchmarkMetrics && latestMetrics
          ? compareToBenchmark(benchmarkMetrics, latestMetrics)
              .cultureRatingPercent
          : null;
      cultureSummaryRows.push({
        School: culture.nameById.get(schoolId) ?? schoolId,
        Benchmark: `${formatDate(benchmark.periodStart)} to ${formatDate(benchmark.periodEnd)}`,
        "Comparative periods": culture.comparatives.filter(
          (c) => c.schoolId === schoolId
        ).length,
        "Latest comparative": latest
          ? `${formatDate(latest.periodStart)} to ${formatDate(latest.periodEnd)}`
          : "",
        "Latest culture %":
          headline == null ? null : Math.round(headline * 10) / 10,
      });
    }
    cultureSummaryRows.sort((a, b) =>
      String(a.School).localeCompare(String(b.School))
    );

    return {
      tables: [
        {
          title: "Schools register",
          rows: register.map((row) => ({
            School: row.name,
            State: row.stateCode,
            Sector: row.sector,
            Levels: row.levels,
            Licence: row.licenceStatus,
            Staff: row.staffCount,
            Teachers: row.teacherCount,
            Classes: row.classCount,
            "Lessons delivered": row.lessonsTotal,
            "Lessons completed": row.lessonsCompleted,
            "AP certified": row.apCertifiedCount,
            "Culture benchmark": row.hasCultureBenchmark ? "Yes" : "No",
            "Last lesson": formatDate(row.lastLessonAt),
          })),
        },
        { title: "Culture trends", rows: cultureSummaryRows },
      ],
    };
  },

  /**
   * School portal pack. School admins and licence accounts get the school
   * pack; teachers and staff get their personal slice only (SOW 5.1.5).
   */
  async getSchoolExportPack(
    ctx: AuthContext,
    schoolSlugOrId: string
  ): Promise<{ tables: ExportPackTable[]; scope: "school" | "personal" }> {
    if (!ctx.userId) throw new Error("Unauthorized");

    const schoolRef = await resolveSchoolRef(schoolSlugOrId);
    if (!schoolRef) throw new Error("School not found");
    const schoolId = schoolRef.id;

    const scopedRoles = await getUserScopedRoles(ctx.userId);
    const isPlatformAdmin = hasPlatformRole(
      scopedRoles,
      "INTRADARK_DEV",
      "PLATFORM_ADMIN",
      "PLATFORM_STAFF"
    );
    const schoolRoleKeys = scopedRoles.school
      .filter((role) => role.schoolId === schoolId)
      .map((role) => role.roleKey);

    if (!isPlatformAdmin && schoolRoleKeys.length === 0) {
      throw new Error("Unauthorized to view reports for this school");
    }

    const certificationCourseId = await getAmaydaCourseId();
    const canSeeSchoolPack =
      isPlatformAdmin ||
      schoolRoleKeys.includes("SCHOOL_ADMIN") ||
      schoolRoleKeys.includes("SCHOOL_LICENCE");

    if (canSeeSchoolPack) {
      const tables = await buildSchoolPackTables(
        schoolId,
        certificationCourseId
      );
      return { tables, scope: "school" };
    }

    // Teacher / staff: personal progress, lesson history, ratings.
    const [ownLessons, ownCertification] = await Promise.all([
      reportExportPackRepo.getLessonHistoryRows(schoolId, ctx.userId),
      reportExportPackRepo.getOwnCertificationRows(ctx.userId),
    ]);

    const courseIds = ownCertification.map((row) => row.courseId);
    const courseNames = courseIds.length
      ? await db
          .select({ id: certificationCourses.id, name: certificationCourses.name })
          .from(certificationCourses)
          .where(inArray(certificationCourses.id, courseIds))
      : [];
    const courseNameById = new Map(
      courseNames.map((c) => [c.id, c.name] as const)
    );

    const ratings = ownLessons
      .map((lesson) => lesson.rating)
      .filter((rating): rating is number => rating != null);
    const averageRating = ratings.length
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) /
        10
      : null;

    return {
      scope: "personal",
      tables: [
        {
          title: "My progress",
          rows: [
            { Metric: "Lessons delivered", Value: ownLessons.length },
            {
              Metric: "Lessons completed",
              Value: ownLessons.filter((l) => l.status === "completed").length,
            },
            { Metric: "Average lesson rating", Value: averageRating },
          ],
        },
        {
          title: "My certification",
          rows: ownCertification.map((row) => ({
            Course: courseNameById.get(row.courseId) ?? row.courseId,
            Progress: `${row.progressPercentage ?? 0}%`,
            "Topics completed": `${row.completedTopics ?? 0} of ${row.totalTopics ?? 0}`,
            Status: row.status,
            Completed: formatDate(row.completedAt),
          })),
        },
        {
          title: "My lesson history",
          rows: ownLessons.map((row) => ({
            Lesson: row.topicTitle,
            Classes: row.classNames,
            Status: row.status,
            Date: formatDate(row.scheduledFor ?? row.createdAt),
            Rating:
              row.rating == null ? null : Math.round(row.rating * 10) / 10,
          })),
        },
      ],
    };
  },
};

/** Used by the admin shell to show the scoped school name in export titles. */
export async function getSchoolNameById(
  schoolId: string
): Promise<string | null> {
  const [row] = await db
    .select({ name: schools.name })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  return row?.name ?? null;
}
