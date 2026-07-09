/**
 * Topic Progress API route handler.
 *
 * Exposes HTTP endpoints for managing user progress through certification topics.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can track their own progress.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId]/progress - Get latest progress attempt for a topic
 * - POST /api/certification/topics/[topicId]/progress - Create or update progress (navigate slides)
 * - PATCH /api/certification/topics/[topicId]/progress - Update progress status or current slide (page exit)
 *
 * Request body (POST):
 * - { currentSlideId?: string }
 *
 * Request body (PATCH):
 * - { currentSlideId?: string, status?: "in_progress" | "quiz_unlocked" | "completed" }
 *
 * Responses:
 * - 200 OK: Returns progress attempt data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when slide is locked (must complete previous slides first).
 * - 404 Not Found: `{ error: string }` when topic or attempt is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle GET /api/certification/topics/[topicId]/progress
 *
 * Returns the latest progress attempt for the authenticated user and specified topic.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the progress attempt or an error payload.
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

    // Get latest attempt
    const latestAttempt = await courseTopicProgressRepo.getLatestAttempt(
      user.id,
      courseId,
      topicId
    );

    return NextResponse.json({ attempt: latestAttempt });
  } catch (error) {
    console.error("Error fetching topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/certification/topics/[topicId]/progress
 *
 * Creates or updates progress for a topic. Used when navigating to a new slide.
 * Validates that slides are unlocked in sequence before allowing access.
 * Automatically marks slides as viewed when navigating to them.
 *
 * @param request The incoming HTTP request containing currentSlideId.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the progress attempt or an error payload.
 */
export async function POST(
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
    const body = await request.json();
    const { currentSlideId } = body;

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

    // Get or create progress (lazy creation when user navigates slides)
    let attempt = await courseTopicProgressRepo.getOrCreateProgress(
      user.id,
      courseId,
      topicId,
      currentSlideId
    );

    // If currentSlideId is provided, handle slide navigation
    if (currentSlideId) {
      // Check if this is a newly created attempt (no currentSlideId set yet)
      const isNewAttempt = !attempt.currentSlideId;

      if (isNewAttempt) {
        // New attempt - just mark slide as viewed (already set as currentSlideId in getOrCreateProgress)
        await courseTopicProgressRepo.markSlideViewed(attempt.id, currentSlideId);
        await userSlideViewsRepo.markSlideViewed({
          userId: user.id,
          slideId: currentSlideId,
          topicId,
          courseId,
        });
      } else {
        // Existing attempt - validate access and update
        const slides = await courseTopicSlidesRepo.getByTopicId(topicId);
        const slideIds = slides.map((s) => s.id);

        // Check if slide is unlocked (allow if topic is completed for review)
        if (attempt.status !== "completed") {
          const isUnlocked = await courseTopicProgressRepo.isSlideUnlocked(
            attempt.id,
            currentSlideId,
            slideIds
          );

          if (!isUnlocked) {
            return NextResponse.json(
              { error: "Slide is locked. Complete previous slides first." },
              { status: 403 }
            );
          }
        }

        // Mark slide as viewed when navigating to it
        await courseTopicProgressRepo.markSlideViewed(attempt.id, currentSlideId);
        await userSlideViewsRepo.markSlideViewed({
          userId: user.id,
          slideId: currentSlideId,
          topicId,
          courseId,
        });

        const updated = await courseTopicProgressRepo.updateCurrentSlide(
          attempt.id,
          currentSlideId
        );
        attempt = updated[0] ?? attempt;
      }
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Error creating/updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PATCH /api/certification/topics/[topicId]/progress
 *
 * Updates progress status or current slide position. Used for page exit updates.
 * Skips unlock validation to allow saving the user's current position regardless of sequence.
 *
 * @param request The incoming HTTP request containing currentSlideId and/or status.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the updated progress attempt or an error payload.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[PATCH /progress] 401 Unauthorized - No user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();
    const { currentSlideId, status } = body;

    console.log("[PATCH /progress] Request:", {
      userId: user.id,
      topicId,
      currentSlideId,
      status,
    });

    // Get topic to find courseId
    const topic = await db
      .select()
      .from(courseTopics)
      .where(eq(courseTopics.id, topicId))
      .limit(1);

    if (!topic[0]) {
      console.log("[PATCH /progress] 404 Topic not found:", topicId);
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const courseId = topic[0].courseId;

    // Get latest attempt
    const latestAttempt = await courseTopicProgressRepo.getLatestAttempt(
      user.id,
      courseId,
      topicId
    );

    if (!latestAttempt) {
      console.log("[PATCH /progress] 404 No attempt found:", {
        userId: user.id,
        courseId,
        topicId,
      });
      return NextResponse.json(
        { error: "No attempt found" },
        { status: 404 }
      );
    }

    console.log("[PATCH /progress] Latest attempt:", {
      attemptId: latestAttempt.id,
      status: latestAttempt.status,
      currentSlideId: latestAttempt.currentSlideId,
      currentSlideIndex: latestAttempt.currentSlideIndex,
    });

    // Update current slide if provided
    // Note: PATCH is used for page exit updates, so we skip unlock validation
    // to allow saving the user's current position regardless of sequence
    if (currentSlideId) {
      // Mark slide as viewed when updating current slide
      await courseTopicProgressRepo.markSlideViewed(
        latestAttempt.id,
        currentSlideId
      );
      await userSlideViewsRepo.markSlideViewed({
        userId: user.id,
        slideId: currentSlideId,
        topicId,
        courseId,
      });

      await courseTopicProgressRepo.updateCurrentSlide(
        latestAttempt.id,
        currentSlideId
      );
      console.log("[PATCH /progress] Updated current slide:", {
        attemptId: latestAttempt.id,
        currentSlideId,
        previousSlideIndex: latestAttempt.currentSlideIndex,
      });
    }

    // Update status if provided
    if (status) {
      await courseTopicProgressRepo.updateStatus(latestAttempt.id, status, {
        completedAt: status === "completed" ? new Date() : null,
      });
      console.log("[PATCH /progress] Updated status:", {
        attemptId: latestAttempt.id,
        status,
      });
    }

    // Return updated attempt
    const updated = await courseTopicProgressRepo.getById(latestAttempt.id);

    console.log("[PATCH /progress] Success:", {
      attemptId: updated[0]?.id,
      currentSlideId: updated[0]?.currentSlideId,
      status: updated[0]?.status,
    });

    return NextResponse.json({ attempt: updated[0] });
  } catch (error) {
    console.error("[PATCH /progress] Error updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
