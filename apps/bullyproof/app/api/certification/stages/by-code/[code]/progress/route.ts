/**
 * Certification Course Progress API route handler.
 *
 * Exposes HTTP endpoints for fetching all topic progress for a certification course.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read their own progress data.
 *
 * Endpoints:
 * - GET /api/certification/courses/by-code/[code]/progress - Get all topic progress for a course
 *
 * Responses:
 * - 200 OK: Returns array of topic progress data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when course is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { certificationCourses } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle GET /api/certification/courses/by-code/[code]/progress
 *
 * Returns all topic progress for a specific certification course by code.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course code.
 * @returns A JSON `NextResponse` with the progress data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Get course by code to get courseId
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, code))
      .limit(1);

    if (!course[0]) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseId = course[0].id;

    // Get all topic progress for this user/course
    // This returns all attempts, but we only want the latest for each topic
    const allProgress = await courseTopicProgressRepo.getByCourse(
      user.id,
      courseId
    );

    // Group by topicId and keep only the latest attempt for each topic
    const progressMap = new Map<string, typeof allProgress[0]>();
    for (const progress of allProgress) {
      const existing = progressMap.get(progress.topicId);
      if (!existing || progress.attemptNumber > existing.attemptNumber) {
        progressMap.set(progress.topicId, progress);
      }
    }

    // Convert map to array
    const latestProgress = Array.from(progressMap.values());

    return NextResponse.json({ progress: latestProgress }, { status: 200 });
  } catch (e: any) {
    console.error("Error fetching course progress:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

