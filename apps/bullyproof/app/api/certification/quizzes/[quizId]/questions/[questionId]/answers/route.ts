/**
 * Quiz Answers API route handler.
 *
 * Exposes HTTP endpoints for quiz answer management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage answers.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/questions/[questionId]/answers - List answers for a question
 * - POST /api/certification/quizzes/[quizId]/questions/[questionId]/answers - Create a new answer
 *
 * Responses:
 * - 200 OK: Returns answer data or array of answers.
 * - 201 Created: Returns the created answer.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAnswersRepo } from "@/server/quiz-answers/quiz-answers.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId } = await params;
    const answers = await quizAnswersRepo.getByQuestionId(questionId);
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
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "/ap-certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz answers" },
        { status: 403 }
      );
    }

    const { questionId } = await params;
    const body = await request.json();

    const answer = await quizAnswersRepo.create({
      ...body,
      questionId,
    });
    return NextResponse.json(answer[0], { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
