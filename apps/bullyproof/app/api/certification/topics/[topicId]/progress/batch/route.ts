import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { quizQuestionsRepo } from "@/server/quiz-questions/quiz-questions.repo";
import { courseTopics, courseTopicProgress } from "@/server/db/schema";
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

    // Get or create attempt
    let attempt = await courseTopicProgressRepo.getLatestAttempt(
      user.id,
      courseId,
      topicId
    );

    if (!attempt) {
      // Create new attempt if none exists
      attempt = await courseTopicProgressRepo.createAttempt(
        user.id,
        courseId,
        topicId,
        currentSlideId || null
      );
    }

    // Deduplicate viewed slide IDs
    const uniqueViewedSlideIds = Array.from(new Set(viewedSlideIds));

    // Get all slides for this topic to validate access
    const slides = await courseTopicSlidesRepo.getByTopicId(topicId);
    const slideIds = slides.map((s) => s.id);

    // Validate slides before marking (but account for slides being marked in this batch)
    if (uniqueViewedSlideIds.length > 0 && attempt.status !== "completed") {
      // Get current attempt state for validation
      const attemptForValidation = await db
        .select({
          currentSlideIndex: courseTopicProgress.currentSlideIndex,
          slideProgress: courseTopicProgress.slideProgress,
        })
        .from(courseTopicProgress)
        .where(eq(courseTopicProgress.id, attempt.id))
        .limit(1);

      if (attemptForValidation.length > 0) {
        const slideProgress = (attemptForValidation[0].slideProgress as Record<string, any>) || {};
        const currentIndex = attemptForValidation[0].currentSlideIndex ?? -1;
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
        // Mark in attempt's slideProgress JSONB
        await courseTopicProgressRepo.markSlideViewed(attempt.id, slideIdToMark);
        
        // Mark in user_slide_views table (idempotent - updates existing or creates new)
        await userSlideViewsRepo.markSlideViewed({
          userId: user.id,
          slideId: slideIdToMark,
          topicId,
          courseId,
        });
      }

      // Refresh attempt to get updated slideProgress
      const refreshedAttempt = await courseTopicProgressRepo.getById(attempt.id);
      if (refreshedAttempt[0]) {
        attempt = refreshedAttempt[0];
      }
    }

    // Update current slide position if provided
    if (currentSlideId) {
      // Validate current slide is unlocked (if not completed)
      if (attempt.status !== "completed") {
        const isUnlocked = await courseTopicProgressRepo.isSlideUnlocked(
          attempt.id,
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
        attempt.id,
        currentSlideId
      );
    }

    // Check if all slides have been viewed - unlock quiz or complete topic
    if (attempt.status === "viewing_slides") {
      const viewedSlides = await userSlideViewsRepo.getAllSlidesViewed(
        user.id,
        topicId
      );
      const slides = await courseTopicSlidesRepo.getByTopicId(topicId);
      const slideIds = slides.map((s) => s.id);
      const allSlidesViewed = viewedSlides.length === slideIds.length;

      if (allSlidesViewed) {
        // Check if topic has valid quizzes (quizzes with questions)
        const hasValidQuizzes = await topicHasValidQuizzes(topicId);
        
        if (hasValidQuizzes) {
          // Topic has quizzes with questions - unlock quiz
          await courseTopicProgressRepo.updateStatus(attempt.id, "quiz_unlocked", {
            quizUnlockedAt: new Date().toISOString() as any,
          });
        } else {
          // Topic has no quizzes or quizzes have no questions - complete topic
          await courseTopicProgressRepo.updateStatus(attempt.id, "completed", {
            completedAt: new Date(),
          });
        }
      }
    }

    // Return updated attempt
    const updated = await courseTopicProgressRepo.getById(attempt.id);

    return NextResponse.json({ attempt: updated[0] });
  } catch (error) {
    console.error("Error batch updating topic progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
