/**
 * Quiz Questions API route handler.
 *
 * Exposes HTTP endpoints for quiz question management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage questions.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/questions - List questions for a quiz
 * - POST /api/certification/quizzes/[quizId]/questions - Create a new question
 *
 * Responses:
 * - 200 OK: Returns question data or array of questions.
 * - 201 Created: Returns the created question.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizQuestionsRepo } from "@/server/quiz-questions/quiz-questions.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const questions = await quizQuestionsRepo.getByQuizId(quizId);
    return NextResponse.json(questions, { status: 200 });
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
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "ap_certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz questions" },
        { status: 403 }
      );
    }

    const { quizId } = await params;
    const body = await request.json();

    const question = await quizQuestionsRepo.create({
      ...body,
      quizId,
    });
    return NextResponse.json(question[0], { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
