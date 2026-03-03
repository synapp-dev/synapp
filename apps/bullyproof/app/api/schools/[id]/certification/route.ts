import { NextResponse } from "next/server";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { assertFeature } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import {
  courseProgress,
  roles,
  userProfile,
  userSchoolPositions,
  userRoles,
} from "@/server/db/schema";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import { ACTION_FEATURES } from "@/lib/feature-keys";

export const dynamic = "force-dynamic";

type CertificationStatus = "not_started" | "in_progress" | "completed";

type SchoolTeacherCertificationRow = {
  userId: string;
  userName: string;
  userEmail: string;
  roles: Array<{
    roleKey: string;
    roleName: string;
    isPlatform: boolean;
  }>;
  status: CertificationStatus;
  progressPercentage: number;
  completedTopics: number;
  totalTopics: number;
  completedAt: string | null;
  isCompleted: boolean;
  isApTeacher: boolean;
};

const AMAYDA_SLUG = "amayda-program";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: schoolId } = await params;

    await assertFeature(
      { userId },
      ACTION_FEATURES.VIEW_SCHOOL_CERTIFICATION,
      schoolId
    );

    const amaydaCourse = await certificationCoursesRepo.getCourseBySlugWithTopics(
      AMAYDA_SLUG
    );

    if (!amaydaCourse) {
      return NextResponse.json(
        { error: "AMAYDA certification course was not found" },
        { status: 404 }
      );
    }

    const teacherAssignments = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(eq(userRoles.schoolId, schoolId), eq(roles.key, "TEACHER"))
      );

    const teacherUserIds = [...new Set(teacherAssignments.map((r) => r.userId))];

    if (teacherUserIds.length === 0) {
      return NextResponse.json(
        {
          data: {
            course: {
              id: amaydaCourse.id,
              code: amaydaCourse.code,
              name: amaydaCourse.name,
            },
            rows: [],
          },
        },
        { status: 200 }
      );
    }

    const [teacherProfiles, teacherRoles, progressRows, apTeacherPositionRows] =
      await Promise.all([
      db
        .select({
          id: userProfile.id,
          firstName: userProfile.firstName,
          lastName: userProfile.lastName,
          email: userProfile.email,
        })
        .from(userProfile)
        .where(inArray(userProfile.id, teacherUserIds)),
      db
        .select({
          userId: userRoles.userId,
          roleKey: roles.key,
          roleName: roles.name,
          roleScope: userRoles.roleScope,
        })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(
          and(
            eq(userRoles.schoolId, schoolId),
            inArray(userRoles.userId, teacherUserIds)
          )
        ),
      db
        .select({
          userId: courseProgress.userId,
          status: courseProgress.status,
          progressPercentage: courseProgress.progressPercentage,
          completedTopics: courseProgress.completedTopics,
          totalTopics: courseProgress.totalTopics,
          completedAt: courseProgress.completedAt,
        })
        .from(courseProgress)
        .where(
          and(
            eq(courseProgress.courseId, amaydaCourse.id),
            inArray(courseProgress.userId, teacherUserIds)
          )
        ),
      db
        .select({
          userId: userSchoolPositions.userId,
        })
        .from(userSchoolPositions)
        .where(
          and(
            eq(userSchoolPositions.schoolId, schoolId),
            inArray(userSchoolPositions.userId, teacherUserIds),
            or(
              ilike(userSchoolPositions.position, "%ap teacher%"),
              ilike(userSchoolPositions.position, "ap teacher%"),
              ilike(userSchoolPositions.position, "% ap %")
            )
          )
        ),
      ]);

    const roleMap = new Map<
      string,
      Array<{ roleKey: string; roleName: string; isPlatform: boolean }>
    >();
    for (const roleRow of teacherRoles) {
      const roleKey = roleRow.roleKey ?? "TEACHER";
      const roleName = roleRow.roleName ?? roleRow.roleKey ?? "Teacher";
      const isPlatform = (roleRow.roleScope ?? "").toLowerCase() === "platform";
      const existing = roleMap.get(roleRow.userId) ?? [];
      const alreadyExists = existing.some(
        (r) => r.roleKey === roleKey && r.roleName === roleName
      );
      if (!alreadyExists) {
        existing.push({ roleKey, roleName, isPlatform });
      }
      roleMap.set(roleRow.userId, existing);
    }

    const progressMap = new Map<
      string,
      (typeof progressRows)[number]
    >();
    for (const progress of progressRows) {
      progressMap.set(progress.userId, progress);
    }

    const apTeacherUserIds = new Set(apTeacherPositionRows.map((r) => r.userId));

    const rows: SchoolTeacherCertificationRow[] = teacherProfiles.map(
      (profile) => {
        const progress = progressMap.get(profile.id);
        const firstName = profile.firstName?.trim() ?? "";
        const lastName = profile.lastName?.trim() ?? "";
        const fallbackName = profile.email;
        const userName = [firstName, lastName].filter(Boolean).join(" ") || fallbackName;

        const status = (progress?.status ?? "not_started") as CertificationStatus;
        const progressPercentage = Number(progress?.progressPercentage ?? 0);
        const completedTopics = Number(progress?.completedTopics ?? 0);
        const totalTopics = Number(progress?.totalTopics ?? amaydaCourse.topicCount ?? 0);
        const isCompleted = status === "completed" || progressPercentage >= 100;

        const userRolesForUser = roleMap.get(profile.id) ?? [
          { roleKey: "TEACHER", roleName: "Teacher", isPlatform: false },
        ];
        const hasApTeacherRole = userRolesForUser.some((role) => {
          const key = role.roleKey.toLowerCase();
          const name = role.roleName.toLowerCase();
          return (
            key.includes("ap_teacher") ||
            key.includes("ap-teacher") ||
            key === "apteacher" ||
            name.includes("ap teacher")
          );
        });

        return {
          userId: profile.id,
          userName,
          userEmail: profile.email,
          roles: userRolesForUser,
          status,
          progressPercentage,
          completedTopics,
          totalTopics,
          completedAt: progress?.completedAt ?? null,
          isCompleted,
          isApTeacher: apTeacherUserIds.has(profile.id) || hasApTeacherRole,
        };
      }
    );

    rows.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.progressPercentage !== b.progressPercentage) {
        return a.progressPercentage - b.progressPercentage;
      }
      return a.userName.localeCompare(b.userName);
    });

    return NextResponse.json(
      {
        data: {
          course: {
            id: amaydaCourse.id,
            code: amaydaCourse.code,
            name: amaydaCourse.name,
          },
          rows,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal error";
    const status = message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
