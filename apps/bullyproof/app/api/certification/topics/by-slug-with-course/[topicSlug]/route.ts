/**
 * Certification Topics by Slug with Course API route handler.
 *
 * Exposes HTTP endpoints for fetching a certification topic by slug with course slug filter.
 * Returns topic, slides, progress, and unlock status in a single response.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification topics.
 *
 * Endpoints:
 * - GET /api/certification/topics/by-slug-with-course/[topicSlug]?course=[courseSlug] - Get topic with slides, progress, and unlock status
 *
 * Responses:
 * - 200 OK: Returns the topic with slides, attempt, and unlock status.
 * - 404 Not Found: Topic or course not found.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { certificationCoursesRepo } from "@/server/certification-courses/certification-courses.repo";
import { courseTopicsRepo } from "@/server/course-topics/course-topics.repo";
import { certificationSlidesService } from "@/server/certification-slides/certification-slides.service";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { createSlug } from "@/utils/slug";

/**
 * Handle GET /api/certification/topics/by-slug-with-course/[topicSlug]?course=[courseSlug]
 *
 * Returns a certification topic with slides, progress, and unlock status.
 * All data is returned in a single response to minimize API calls.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic slug.
 * @returns A JSON `NextResponse` with topic, slides, attempt, and unlock status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ topicSlug: string }> }
) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const { topicSlug } = await params;
    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("course");

    if (!courseSlug) {
      return NextResponse.json(
        { error: "Course slug query parameter is required" },
        { status: 400 }
      );
    }

    // 1. Find course by slug
    const courses = await certificationCoursesRepo.getCourseBySlug(courseSlug);
    if (courses.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    const course = courses[0];

    // 2. Find topic by slug within this course
    // Get all topics for the course and find matching slug
    const allTopics = await courseTopicsRepo.getByCourseCode(course.code);
    const foundTopic = allTopics.find(
      (t) => createSlug(t.title) === topicSlug
    );

    if (!foundTopic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // 3. Check unlock status
    const topicOrder = foundTopic.courseOrder ?? 1;
    const isFirstTopic = topicOrder === 1;
    let isUnlocked = isFirstTopic; // First topic is always unlocked
    let unlockReason: string | undefined = isFirstTopic ? "first_topic" : undefined;

    if (!isFirstTopic) {
      // Check if all previous topics are completed
      const previousTopics = allTopics.filter((t) => {
        const tOrder = t.courseOrder ?? 999;
        return tOrder < topicOrder;
      });

      if (previousTopics.length > 0) {
        // Get course progress to check completion status
        const allProgress = await courseTopicProgressRepo.getByCourse(
          user.id,
          course.id
        );

        // Group by topicId and get latest attempt for each topic
        const progressMap = new Map<string, typeof allProgress[0]>();
        for (const progress of allProgress) {
          const existing = progressMap.get(progress.topicId);
          const currentTopicAttemptNumber =
            (progress as any).topicProgressAttemptNumber ?? progress.attemptNumber;
          const existingTopicAttemptNumber = existing
            ? (existing as any).topicProgressAttemptNumber ?? existing.attemptNumber
            : 0;

          if (!existing || currentTopicAttemptNumber > existingTopicAttemptNumber) {
            progressMap.set(progress.topicId, progress);
          }
        }

        // Get completed topic IDs
        const completedTopicIds = new Set(
          Array.from(progressMap.values())
            .filter(
              (p) => p.status === "completed" || p.status === "passed"
            )
            .map((p) => p.topicId)
        );

        // Check if all previous topics are completed
        const allPreviousCompleted =
          previousTopics.length === 0 ||
          previousTopics.every((t) => completedTopicIds.has(t.id));

        isUnlocked = allPreviousCompleted;
        if (!allPreviousCompleted) {
          unlockReason = "previous_topics_not_completed";
        }
      } else {
        // No previous topics, so it's unlocked
        isUnlocked = true;
        unlockReason = "no_previous_topics";
      }
    }

    // If topic is locked, return topic data with unlock status (don't fetch slides/attempt)
    if (!isUnlocked) {
      return NextResponse.json(
        {
          topic: foundTopic,
          slides: [],
          attempt: null,
          isUnlocked: false,
          unlockReason,
        },
        { status: 200 }
      );
    }

    // 4. Fetch slides with signed URLs
    const slides = await certificationSlidesService.getSlidesByTopicId(
      { userId: user.id },
      foundTopic.id
    );

    // 5. Get or create progress when user first views slides
    // This creates a progress row with status "viewing_slides" as soon as user views the slides
    // If progress already exists, getOrCreateProgress returns the existing row (no duplicates)
    let attempt = null;
    try {
      // Get first slide ID if slides exist, so initial slide is tracked
      const firstSlideId = slides.length > 0 ? slides[0].id : undefined;
      
      attempt = await courseTopicProgressRepo.getOrCreateProgress(
        user.id,
        course.id,
        foundTopic.id,
        firstSlideId
      );
    } catch (attemptError: any) {
      // Log the error but don't fail the request - user should still see slides
      console.error("Error getting/creating progress (non-blocking):", attemptError);
      // attempt remains null, which is fine - user can still view slides
    }

    // Return everything in one response
    return NextResponse.json(
      {
        topic: foundTopic,
        slides,
        attempt,
        isUnlocked: true,
        unlockReason,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching topic by slug with course:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
