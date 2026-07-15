/**
 * Batch Topic Progress Update API route handler.
 *
 * Exposes HTTP endpoint for batch updating slide views and progress for a topic.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can update their own progress.
 *
 * Endpoints:
 * - POST /api/certification/topics/[topicId]/progress/batch - Batch update slide views and progress
 *
 * Request body:
 * - { currentSlideId?: string, viewedSlideIds: string[] }
 *
 * Responses:
 * - 200 OK: Returns updated progress attempt.
 * - 400 Bad Request: `{ error: string }` when viewedSlideIds is not an array.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when slides are locked (must complete previous slides first).
 * - 404 Not Found: `{ error: string }` when topic is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopics, courseTopicProgress } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

/**
 * Handle POST /api/certification/topics/[topicId]/progress/batch
 *
 * Batch updates slide views and progress for a topic. Validates that slides are unlocked
 * in sequence before allowing batch marking. Useful for marking multiple slides as viewed
 * in a single request.
 *
 * @param request The incoming HTTP request containing currentSlideId and viewedSlideIds.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the updated progress attempt or an error payload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const { topicId } = await params;
    const body = await request.json();
    const { currentSlideId, viewedSlideIds } = body;

    if (!Array.isArray(viewedSlideIds)) {
      return NextResponse.json(
        { error: "viewedSlideIds must be an array" },
        { status: 400 }
      );
    }

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
    const progress = await courseTopicProgressRepo.getOrCreateProgress(
      user.id,
      courseId,
      topicId,
      currentSlideId || null
    );

    // Deduplicate viewed slide IDs
    const uniqueViewedSlideIds = Array.from(new Set(viewedSlideIds));

    // Get all slides for this topic to validate access
    const slides = await courseTopicSlidesRepo.getByTopicId(topicId);
    const slideIds = slides.map((s) => s.id);

    // Validate slides before marking (but account for slides being marked in this batch)
    if (uniqueViewedSlideIds.length > 0 && progress.status !== "completed") {
      // Get current progress state for validation
      const progressForValidation = await db
        .select({
          currentSlideIndex: courseTopicProgress.currentSlideIndex,
          slideProgress: courseTopicProgress.slideProgress,
        })
        .from(courseTopicProgress)
        .where(eq(courseTopicProgress.id, progress.id))
        .limit(1);

      if (progressForValidation.length > 0) {
        const slideProgress = (progressForValidation[0].slideProgress as Record<string, any>) || {};
        const currentIndex = progressForValidation[0].currentSlideIndex ?? -1;
        const viewedSlideIdsSet = new Set(uniqueViewedSlideIds);

        // Validate each slide is either already viewed, or is the next in sequence
        for (const slideIdToCheck of uniqueViewedSlideIds) {
          const slideIndex = slideIds.indexOf(slideIdToCheck);
          
          // Check if already viewed
          if (slideProgress[slideIdToCheck]?.viewed) {
            continue; // Already viewed, allow
          }

          // Check if it's the next slide in sequence (currentIndex + 1)
          // OR if all previous slides up to this one are being marked as viewed in this batch
          if (slideIndex <= currentIndex + 1) {
            continue; // Next in sequence, allow
          }

          // Check if all slides before this one are being marked as viewed in this batch
          let allPreviousMarked = true;
          for (let i = 0; i < slideIndex; i++) {
            const prevSlideId = slideIds[i];
            const isPrevViewed = slideProgress[prevSlideId]?.viewed || viewedSlideIdsSet.has(prevSlideId);
            if (!isPrevViewed) {
              allPreviousMarked = false;
              break;
            }
          }

          if (!allPreviousMarked) {
            return NextResponse.json(
              {
                error: `Slide is locked. Complete previous slides first.`,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Mark all viewed slides in batch (idempotent - won't create duplicates)
    if (uniqueViewedSlideIds.length > 0) {
      for (const slideIdToMark of uniqueViewedSlideIds) {
        // Mark in progress's slideProgress JSONB
        await courseTopicProgressRepo.markSlideViewed(progress.id, slideIdToMark);
        
        // Mark in user_slide_views table (idempotent - updates existing or creates new)
        await userSlideViewsRepo.markSlideViewed({
          userId: user.id,
          slideId: slideIdToMark,
          topicId,
          courseId,
        });
      }
    }

    // Update current slide position if provided
    if (currentSlideId) {
      // Validate current slide is unlocked (if not completed)
      if (progress.status !== "completed") {
        const isUnlocked = await courseTopicProgressRepo.isSlideUnlocked(
          progress.id,
          currentSlideId,
          slideIds
        );

        if (!isUnlocked) {
          return NextResponse.json(
            {
              error: "Current slide is locked. Complete previous slides first.",
            },
            { status: 403 }
          );
        }
      }

      await courseTopicProgressRepo.updateCurrentSlide(
        progress.id,
        currentSlideId
      );
    }

    // Return updated progress
    const updated = await courseTopicProgressRepo.getById(progress.id);

    return NextResponse.json({ attempt: updated[0] });
  } catch (error) {
    console.error("Error batch updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
