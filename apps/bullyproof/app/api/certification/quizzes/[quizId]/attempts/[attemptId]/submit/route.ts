/**
 * Submit Quiz Attempt API route handler.
 *
 * Exposes HTTP endpoints for submitting and scoring a quiz attempt.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only submit their own attempts.
 *
 * Endpoints:
 * - POST /api/certification/quizzes/[quizId]/attempts/[attemptId]/submit - Submit and score a quiz attempt
 *
 * Responses:
 * - 200 OK: Returns the scored attempt.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when attempt is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { courseTopicQuizCompletionsRepo } from "@/server/course-topic-quiz-completions/course-topic-quiz-completions.repo";
import { courseTopicProgressRepo } from "@/server/course-topic-progress/course-topic-progress.repo";
import { courseProgressRepo } from "@/server/course-progress/course-progress.repo";
import { createServerClient } from "@/utils/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;

    // Verify attempt ownership
    const attempt = await quizAttemptsRepo.getById(attemptId);
    if (attempt.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt[0].userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Calculate score
    const scoredAttempt = await quizAttemptsRepo.calculateScore(attemptId);
    const finalAttempt = scoredAttempt[0];

    // If passed, mark quiz as completed
    // Note: We wrap this in try-catch to ensure quiz submission always returns result
    // even if progress tracking fails
    if (finalAttempt.isPassed) {
      try {
        await courseTopicQuizCompletionsRepo.markQuizPassed({
          userId: user.id,
          topicId: finalAttempt.topicId,
          quizId: finalAttempt.quizId,
          passedAttemptId: finalAttempt.id,
        });

        // Get topic progress to check current status
        const topicProgress = await courseTopicProgressRepo.getLatestAttempt(
          user.id,
          finalAttempt.courseId,
          finalAttempt.topicId
        );

        // If topic is not already completed, update it to completed
        // This ensures that once a topic is marked completed, it stays completed
        if (topicProgress && topicProgress.status !== "completed") {
          await courseTopicProgressRepo.updateStatus(topicProgress.id, "completed", {
            completedAt: new Date(),
          });

          // Update course-level progress
          // Wrap in try-catch to prevent progress update errors from blocking quiz submission
          try {
            await courseProgressRepo.updateProgress(user.id, finalAttempt.courseId);
          } catch (progressError: any) {
            // Log but don't fail - quiz submission should succeed even if progress update fails
            console.error("Failed to update course progress:", progressError);
          }
        }
      } catch (completionError: any) {
        // Log but don't fail - quiz submission should succeed even if completion tracking fails
        console.error("Failed to mark quiz as completed:", completionError);
      }
    }

    // Always return the quiz attempt result, regardless of progress tracking success/failure
    return NextResponse.json(finalAttempt, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
