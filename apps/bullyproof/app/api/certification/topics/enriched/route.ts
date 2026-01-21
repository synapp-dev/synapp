/**
 * Certification Topics Enriched API route handler.
 *
 * Exposes HTTP endpoints for fetching enriched certification topics data.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 *
 * Endpoints:
 * - GET /api/certification/topics/enriched?courseCode=xxx - Get enriched topics by course code
 *
 * Responses:
 * - 200 OK: Returns array of enriched certification topics.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";
import { vCourseTopicsEnriched, certificationCourses } from "@/server/db/schema";

/**
 * Handle GET /api/certification/topics/enriched
 *
 * Returns enriched certification topics for a specific course code.
 * Includes slide counts, quiz existence, and user quiz completion status.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the enriched topics array or an error payload.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get("courseCode");

    if (!courseCode) {
      return NextResponse.json(
        { error: "courseCode query parameter is required" },
        { status: 400 }
      );
    }

    // Get course by code to get courseId
    const course = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.code, courseCode))
      .limit(1);

    if (!course[0]) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseId = course[0].id;

    // Query the enriched view filtered by course_id
    // The view is user-scoped via auth.uid() in the SQL
    const enrichedTopics = await db
      .select()
      .from(vCourseTopicsEnriched)
      .where(eq(vCourseTopicsEnriched.courseId, courseId))
      .orderBy(vCourseTopicsEnriched.courseOrder);

    return NextResponse.json(enrichedTopics, { status: 200 });
  } catch (e: any) {
    console.error("Error fetching enriched topics:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
