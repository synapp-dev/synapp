/**
 * Quiz Attempt Answers API route handler.
 *
 * Exposes HTTP endpoints for submitting answers to a quiz attempt.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only submit answers to their own attempts.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/attempts/[attemptId]/answers - Get all answers for an attempt
 * - POST /api/certification/quizzes/[quizId]/attempts/[attemptId]/answers - Submit/upsert answers (accepts answerIds array)
 *
 * Responses:
 * - 200 OK: Returns answer data or array of answers.
 * - 201 Created: Returns the created answer.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptAnswersRepo } from "@/server/quiz-attempt-answers/quiz-attempt-answers.repo";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(
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

    const answers = await quizAttemptAnswersRepo.getByAttempt(attemptId);
    return NextResponse.json(answers, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

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
    const body = await request.json();

    // Verify attempt ownership
    const attempt = await quizAttemptsRepo.getById(attemptId);
    if (attempt.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt[0].userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate request body
    if (!body.questionId || !body.answerIds || !Array.isArray(body.answerIds) || body.answerIds.length === 0) {
      return NextResponse.json(
        { error: "questionId and answerIds (non-empty array) are required" },
        { status: 400 }
      );
    }

    // Submit/upsert answer (handles both insert and update)
    const answer = await quizAttemptAnswersRepo.submitAnswer({
      attemptId,
      questionId: body.questionId,
      answerIds: body.answerIds,
      timeTakenSeconds: body.timeTakenSeconds,
    });

    // Update attempt correct answers count (recalculate based on all answers)
    // Note: isCorrect in the answer record is a simplified check
    // Full correctness is calculated during quiz submission
    await quizAttemptsRepo.updateAnswer(
      attemptId,
      body.questionId,
      body.answerIds[0], // Pass first answer ID for compatibility (scoring logic will use all answers)
      answer[0].isCorrect ?? false
    );

    return NextResponse.json(answer[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
