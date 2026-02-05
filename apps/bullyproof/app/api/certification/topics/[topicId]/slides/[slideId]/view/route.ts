/**
 * Mark Slide as Viewed API route handler.
 *
 * Exposes HTTP endpoint for marking a slide as viewed in a topic.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can mark their own slides as viewed.
 *
 * Endpoints:
 * - POST /api/certification/topics/[topicId]/slides/[slideId]/view - Mark a slide as viewed
 *
 * Responses:
 * - 200 OK: Returns success confirmation.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when topic is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle POST /api/certification/topics/[topicId]/slides/[slideId]/view
 *
 * Marks a slide as viewed for the authenticated user. Creates progress if it doesn't exist.
 * Updates both the topic progress tracking and the user slide views table.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID and slide ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string; slideId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId, slideId } = await params;

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

    // Get or create progress (lazy creation when user views slides)
    const progress = await courseTopicProgressRepo.getOrCreateProgress(
      user.id,
      courseId,
      topicId,
      slideId
    );

    // Mark slide as viewed
    await courseTopicProgressRepo.markSlideViewed(progress.id, slideId);
    await userSlideViewsRepo.markSlideViewed({
      userId: user.id,
      slideId,
      topicId,
      courseId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking slide as viewed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

