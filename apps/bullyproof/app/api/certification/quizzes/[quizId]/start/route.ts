/**
 * Start Quiz Attempt API route handler.
 *
 * Exposes HTTP endpoints for starting a quiz attempt.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can start quiz attempts.
 *
 * Endpoints:
 * - POST /api/certification/quizzes/[quizId]/start - Start a new quiz attempt
 *
 * Request body:
 * - { courseId: string, topicProgressId?: string }
 *
 * Responses:
 * - 200 OK: Returns existing in-progress attempt (if one exists).
 * - 201 Created: Returns the created attempt.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when quiz is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Handle POST /api/certification/quizzes/[quizId]/start
 *
 * Starts a new quiz attempt or returns an existing in-progress attempt.
 * Handles race conditions by checking for in-progress attempts both before
 * and after attempting to create a new one.
 *
 * @param request The incoming HTTP request containing courseId and optional topicProgressId.
 * @param params The route parameters containing the quiz ID.
 * @returns A JSON `NextResponse` with the quiz attempt or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const body = await request.json();

    // Get quiz to get topicId and courseId
    const quiz = await courseTopicQuizzesRepo.getById(quizId);
    if (quiz.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    // Check for in-progress attempt
    const inProgress = await quizAttemptsRepo.getInProgressAttempt(
      user.id,
      quizId
    );

    if (inProgress) {
      return NextResponse.json(inProgress, { status: 200 });
    }

    // Create new attempt
    try {
      const attempt = await quizAttemptsRepo.createAttempt({
        userId: user.id,
        quizId,
        topicId: quiz[0].topicId,
        courseId: body.courseId, // Should be provided in request body
        topicProgressId: body.topicProgressId ?? null,
      });

      return NextResponse.json(attempt, { status: 201 });
    } catch (createError: any) {
      // If createAttempt throws an error about in-progress attempt, check again
      // This handles race conditions where an attempt was created between our check and createAttempt call
      if (createError.message?.includes("in-progress")) {
        const inProgress = await quizAttemptsRepo.getInProgressAttempt(
          user.id,
          quizId
        );
        if (inProgress) {
          return NextResponse.json(inProgress, { status: 200 });
        }
      }
      throw createError; // Re-throw if it's a different error
    }
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
