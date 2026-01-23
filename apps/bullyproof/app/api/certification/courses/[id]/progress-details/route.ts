/**
 * Certification Course Progress Details API route handler.
 *
 * Exposes HTTP endpoints for fetching detailed course progress with user and school information (admin only).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin permissions (403 if not admin).
 *
 * Endpoints:
 * - GET /api/certification/courses/[id]/progress-details - Get course progress details with user and school data
 *
 * Responses:
 * - 200 OK: Returns course progress details array.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { eq, sql } from "drizzle-orm";
import { courseProgress, userProfile, userRoles, schools } from "@/server/db/schema";
import { db } from "@/server/db/drizzle";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is platform admin
    const roles = await getUserScopedRoles(userId);
    const isPlatformAdmin = roles.platform.includes("PLATFORM_ADMIN");

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Platform admin access required" },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;

    // Query course_progress with user and school information
    // Use LEFT JOINs since users might not have school associations
    const progressDetails = await db
      .select({
        id: courseProgress.id,
        userId: courseProgress.userId,
        userEmail: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        schools: sql<string[]>`COALESCE(
          array_agg(DISTINCT ${schools.name}) FILTER (WHERE ${schools.name} IS NOT NULL),
          ARRAY[]::text[]
        )`,
        status: courseProgress.status,
        progressPercentage: courseProgress.progressPercentage,
        completedTopics: courseProgress.completedTopics,
        totalTopics: courseProgress.totalTopics,
        startedAt: courseProgress.startedAt,
        completedAt: courseProgress.completedAt,
        updatedAt: courseProgress.updatedAt,
      })
      .from(courseProgress)
      .leftJoin(userProfile, eq(courseProgress.userId, userProfile.id))
      .leftJoin(userRoles, eq(userProfile.id, userRoles.userId))
      .leftJoin(schools, eq(userRoles.schoolId, schools.id))
      .where(eq(courseProgress.courseId, courseId))
      .groupBy(
        courseProgress.id,
        courseProgress.userId,
        userProfile.email,
        userProfile.firstName,
        userProfile.lastName,
        courseProgress.status,
        courseProgress.progressPercentage,
        courseProgress.completedTopics,
        courseProgress.totalTopics,
        courseProgress.startedAt,
        courseProgress.completedAt,
        courseProgress.updatedAt
      )
      .orderBy(sql`${courseProgress.updatedAt} DESC`);

    return NextResponse.json(
      {
        progressDetails: progressDetails.map((detail) => {
          // Construct user name from firstName and lastName, fallback to email
          const userName = detail.firstName && detail.lastName
            ? `${detail.firstName} ${detail.lastName}`.trim()
            : detail.firstName || detail.lastName || detail.userEmail || "Unknown User";

          return {
            id: detail.id,
            userId: detail.userId,
            userName,
            userEmail: detail.userEmail || "",
            schools: Array.isArray(detail.schools) ? detail.schools : [],
            status: detail.status,
            progressPercentage: detail.progressPercentage,
            completedTopics: detail.completedTopics,
            totalTopics: detail.totalTopics,
            startedAt: detail.startedAt,
            completedAt: detail.completedAt,
            updatedAt: detail.updatedAt,
          };
        }),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching course progress details:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
