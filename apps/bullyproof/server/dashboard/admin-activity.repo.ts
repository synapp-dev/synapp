import { db } from "@/server/db/drizzle";
import {
  certificationCourses,
  classes,
  courseProgress,
  lessonClasses,
  lessons,
  schools,
  topics,
  userProfile,
} from "@/server/db/schema";
import { desc, eq, inArray, or, sql } from "drizzle-orm";

const PER_SOURCE_FETCH = 30;
const GLOBAL_LIMIT = 30;

export type AdminActivityEventType =
  | "school_onboarded"
  | "class_completed"
  | "training_completed"
  | "user_registered"
  | "certificate_issued";

export type AdminActivityFeedItem = {
  id: string;
  type: AdminActivityEventType;
  message: string;
  occurredAt: string;
};

function displayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string | null | undefined
): string {
  const fn = firstName?.trim() ?? "";
  const ln = lastName?.trim() ?? "";
  if (fn || ln) return [fn, ln].filter(Boolean).join(" ");
  const e = email?.trim() ?? "";
  if (e) {
    const local = e.split("@")[0]?.trim();
    if (local) return local;
  }
  return "User";
}

function occurredMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

export const adminActivityRepo = {
  async listRecentActivity(): Promise<AdminActivityFeedItem[]> {
    const schoolRows = await db
      .select({
        id: schools.id,
        name: schools.name,
        occurredAtRaw: sql<string>`coalesce(${schools.joinedAt}, ${schools.createdAt})`,
      })
      .from(schools)
      .orderBy(
        desc(sql`coalesce(${schools.joinedAt}, ${schools.createdAt})`)
      )
      .limit(PER_SOURCE_FETCH);

    const lessonRows = await db
      .select({
        lessonId: lessons.id,
        topicTitle: topics.title,
        schoolName: schools.name,
        // No completedAt on lessons; createdAt is used elsewhere as recency proxy.
        createdAt: lessons.createdAt,
      })
      .from(lessons)
      .innerJoin(topics, eq(topics.id, lessons.topicId))
      .innerJoin(schools, eq(schools.id, lessons.schoolId))
      .where(eq(lessons.status, "completed"))
      .orderBy(desc(lessons.createdAt))
      .limit(PER_SOURCE_FETCH);

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

    const userRows = await db
      .select({
        id: userProfile.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
        createdAt: userProfile.createdAt,
      })
      .from(userProfile)
      .orderBy(desc(userProfile.createdAt))
      .limit(PER_SOURCE_FETCH);

    const progressRows = await db
      .select({
        id: courseProgress.id,
        certificateIssuedAt: courseProgress.certificateIssuedAt,
        completedAt: courseProgress.completedAt,
        updatedAt: courseProgress.updatedAt,
        status: courseProgress.status,
        courseName: certificationCourses.name,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        email: userProfile.email,
      })
      .from(courseProgress)
      .innerJoin(
        certificationCourses,
        eq(certificationCourses.id, courseProgress.courseId)
      )
      .innerJoin(userProfile, eq(userProfile.id, courseProgress.userId))
      .where(
        or(
          eq(courseProgress.status, "completed"),
          sql`${courseProgress.certificateIssuedAt} is not null`
        )
      )
      .orderBy(
        desc(
          sql<string>`coalesce(${courseProgress.certificateIssuedAt}, ${courseProgress.completedAt}, ${courseProgress.updatedAt})`
        )
      )
      .limit(PER_SOURCE_FETCH);

    const merged: AdminActivityFeedItem[] = [];

    for (const s of schoolRows) {
      const occurredAt = s.occurredAtRaw;
      if (!occurredAt) continue;
      merged.push({
        id: `school_onboarded:${s.id}`,
        type: "school_onboarded",
        message: `${s.name} joined the platform`,
        occurredAt,
      });
    }

    for (const row of lessonRows) {
      const occurredAt = row.createdAt;
      if (!occurredAt) continue;
      const classNames = classNamesByLessonId.get(row.lessonId);
      const topic = row.topicTitle || "lesson";
      const school = row.schoolName || "a school";
      const message = classNames?.trim()
        ? `${classNames} completed '${topic}' at ${school}`
        : `'${topic}' completed at ${school}`;
      merged.push({
        id: `class_completed:${row.lessonId}`,
        type: "class_completed",
        message,
        occurredAt,
      });
    }

    for (const u of userRows) {
      const occurredAt = u.createdAt;
      if (!occurredAt) continue;
      const name = displayName(u.firstName, u.lastName, u.email);
      merged.push({
        id: `user_registered:${u.id}`,
        type: "user_registered",
        message: `${name} registered`,
        occurredAt,
      });
    }

    for (const p of progressRows) {
      const occurredAt =
        p.certificateIssuedAt ??
        p.completedAt ??
        p.updatedAt ??
        null;
      if (!occurredAt) continue;
      const name = displayName(p.firstName, p.lastName, p.email);
      const course = p.courseName?.trim() || "training";

      if (p.certificateIssuedAt) {
        merged.push({
          id: `certificate_issued:${p.id}`,
          type: "certificate_issued",
          message: `Certificate awarded to ${name} (${course})`,
          occurredAt: p.certificateIssuedAt,
        });
      } else if (p.status === "completed") {
        merged.push({
          id: `training_completed:${p.id}`,
          type: "training_completed",
          message: `${name} completed ${course}`,
          occurredAt,
        });
      }
    }

    merged.sort(
      (a, b) => occurredMs(b.occurredAt) - occurredMs(a.occurredAt)
    );

    return merged.slice(0, GLOBAL_LIMIT);
  },
};
