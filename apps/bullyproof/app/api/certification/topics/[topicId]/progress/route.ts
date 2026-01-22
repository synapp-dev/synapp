import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { quizQuestionsRepo } from "@/server/quiz-questions/quiz-questions.repo";
import { courseTopicsRepo } from "@/server/course-topics/course-topics.repo";
import { courseTopics } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/server/db/drizzle";

// Helper function to check if topic has valid quizzes (quizzes with questions)
async function topicHasValidQuizzes(topicId: string): Promise<boolean> {
  const quizzes = await courseTopicQuizzesRepo.getByTopicId(topicId);
  if (quizzes.length === 0) return false;
  
  for (const quiz of quizzes) {
    const questions = await quizQuestionsRepo.getByQuizId(quiz.id);
    if (questions.length > 0) return true;
  }
  return false;
}

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
