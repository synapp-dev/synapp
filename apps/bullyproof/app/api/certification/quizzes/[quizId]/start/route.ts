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
 * Responses:
 * - 201 Created: Returns the created attempt.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";

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
    const attempt = await quizAttemptsRepo.createAttempt({
      userId: user.id,
      quizId,
      topicId: quiz[0].topicId,
      courseId: body.courseId, // Should be provided in request body
      topicProgressId: body.topicProgressId ?? null,
    });

    return NextResponse.json(attempt, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
