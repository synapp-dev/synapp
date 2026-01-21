/**
 * Quiz Question by ID API route handler.
 *
 * Exposes HTTP endpoints for specific question management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage questions.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/questions/[questionId] - Get question by ID
 * - PUT /api/certification/quizzes/[quizId]/questions/[questionId] - Update question
 * - DELETE /api/certification/quizzes/[quizId]/questions/[questionId] - Delete question
 *
 * Responses:
 * - 200 OK: Returns question data or updated question.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when question is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizQuestionsRepo } from "@/server/quiz-questions/quiz-questions.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";

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
    const questions = await quizQuestionsRepo.getById(questionId);

    if (questions.length === 0) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json(questions[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz questions" },
        { status: 403 }
      );
    }

    const { questionId } = await params;
    const body = await request.json();

    const question = await quizQuestionsRepo.update(questionId, body);
    return NextResponse.json(question[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz questions" },
        { status: 403 }
      );
    }

    const { questionId } = await params;
    await quizQuestionsRepo.delete(questionId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
