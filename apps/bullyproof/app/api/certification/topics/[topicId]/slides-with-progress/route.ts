/**
 * Topic Slides with Progress API route handler.
 *
 * Exposes HTTP endpoint for fetching slides with signed URLs and user progress in a single request.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can view their own progress.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId]/slides-with-progress - Get slides with progress
 *
 * Responses:
 * - 200 OK: Returns slides array and progress attempt object.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when topic is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { certificationSlidesService } from "@/server/certification-slides/certification-slides.service";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle GET /api/certification/topics/[topicId]/slides-with-progress
 *
 * Returns slides for a topic with signed URLs along with the user's current progress/attempt.
 * This consolidates multiple API calls into a single request for better performance.
 * Progress is fetched but not created if it doesn't exist (lazy creation on navigation).
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with slides and progress attempt or an error payload.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;

    // Get topic to find courseId
    const topic = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    if (!topic[0]) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const courseId = topic[0].courseId;

    // Fetch slides with signed URLs
    const slides = await certificationSlidesService.getSlidesByTopicId(
      { userId: user.id },
      topicId
    );

    // Get existing progress (if any) - don't create on page load
    // Progress will be created lazily when user navigates slides
    let attempt = null;
    try {
      attempt = await courseTopicProgressRepo.getProgress(
        user.id,
        courseId,
        topicId
      );
    } catch (attemptError: any) {
      // Log the error but don't fail the request - user should still see slides
      console.error("Error getting progress (non-blocking):", attemptError);
      // attempt remains null, which is fine - user can still view slides
    }

    return NextResponse.json({
      slides,
      attempt,
    });
  } catch (error) {
    console.error("Error fetching slides with progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
