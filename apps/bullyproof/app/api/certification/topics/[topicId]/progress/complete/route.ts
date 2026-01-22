import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { quizQuestionsRepo } from "@/server/quiz-questions/quiz-questions.repo";
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

    // Get or create progress (lazy creation when user completes slides)
    const attempt = await courseTopicProgressRepo.getOrCreateProgress(
      user.id,
      courseId,
      topicId,
      currentSlideId || null
    );

    // Mark the last slide as viewed if provided
    if (currentSlideId) {
      await courseTopicProgressRepo.markSlideViewed(attempt.id, currentSlideId);
      await userSlideViewsRepo.markSlideViewed({
        userId: user.id,
        slideId: currentSlideId,
        topicId,
        courseId,
      });
    }

    // Check if topic has valid quizzes (quizzes with questions)
    const hasValidQuizzes = await topicHasValidQuizzes(topicId);

    // Update status based on whether topic has quizzes
    const now = new Date();
    if (hasValidQuizzes) {
      // Topic has quizzes with questions - unlock quiz
      await courseTopicProgressRepo.updateStatus(attempt.id, "quiz_unlocked", {
        slidesCompletedAt: now,
        quizUnlockedAt: now,
      });
    } else {
      // Topic has no quizzes or quizzes have no questions - complete topic
      await courseTopicProgressRepo.updateStatus(attempt.id, "completed", {
        slidesCompletedAt: now,
        completedAt: now,
      });
    }

    // Get updated attempt
    const updated = await courseTopicProgressRepo.getById(attempt.id);
    const finalAttempt = updated[0] ?? attempt;

    return NextResponse.json({
      attempt: finalAttempt,
      hasQuiz: hasValidQuizzes,
    });
  } catch (error) {
    console.error("Error completing topic slides:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
