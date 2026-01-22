/**
 * Unrated Courses API route handler.
 *
 * Returns courses that the user has completed but hasn't rated yet.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/certification/courses/unrated - Get list of completed courses without ratings
 *
 * Responses:
 * - 200 OK: Returns array of courses that need rating.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { courseProgress, certificationCourses, courseRatings } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[UnratedCourses] Fetching unrated courses for user: ${user.id}`);

    // Get all completed courses for the user
    const completedCourses = await db
      .select({
        courseId: courseProgress.courseId,
        courseName: certificationCourses.name,
        completedAt: courseProgress.completedAt,
      })
      .from(courseProgress)
      .innerJoin(
        certificationCourses,
        eq(certificationCourses.id, courseProgress.courseId)
      )
      .where(
        and(
          eq(courseProgress.userId, user.id),
          eq(courseProgress.status, "completed")
        )
      );

    console.log(`[UnratedCourses] Found ${completedCourses.length} completed courses`);

    if (completedCourses.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Get courses that the user has already rated
    const ratedCourseIds = await db
      .select({ courseId: courseRatings.courseId })
      .from(courseRatings)
      .where(eq(courseRatings.userId, user.id));

    const ratedCourseIdSet = new Set(ratedCourseIds.map((r) => r.courseId));

    // Filter out courses that have been rated
    const unratedCourses = completedCourses
      .filter((course) => !ratedCourseIdSet.has(course.courseId))
      .map((course) => ({
        id: course.courseId,
        name: course.courseName,
        completedAt: course.completedAt,
      }))
      // Sort by completion date (most recent first)
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA;
      });

    console.log(`[UnratedCourses] Found ${unratedCourses.length} unrated courses:`, unratedCourses.map(c => c.name));

    return NextResponse.json(unratedCourses, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching unrated courses:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
