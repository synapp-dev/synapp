/**
 * Quiz Answer by ID API route handler.
 *
 * Exposes HTTP endpoints for specific answer management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage answers.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId] - Get answer by ID
 * - PUT /api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId] - Update answer
 * - DELETE /api/certification/quizzes/[quizId]/questions/[questionId]/answers/[answerId] - Delete answer
 *
 * Responses:
 * - 200 OK: Returns answer data or updated answer.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when answer is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAnswersRepo } from "@/server/quiz-answers/quiz-answers.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string; questionId: string; answerId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answerId } = await params;
    const answers = await quizAnswersRepo.getById(answerId);

    if (answers.length === 0) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    return NextResponse.json(answers[0], { status: 200 });
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
  { params }: { params: Promise<{ quizId: string; questionId: string; answerId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz answers" },
        { status: 403 }
      );
    }

    const { answerId } = await params;
    const body = await request.json();

    const answer = await quizAnswersRepo.update(answerId, body);
    return NextResponse.json(answer[0], { status: 200 });
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
  { params }: { params: Promise<{ quizId: string; questionId: string; answerId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized to manage quiz answers" },
        { status: 403 }
      );
    }

    const { answerId } = await params;
    await quizAnswersRepo.delete(answerId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
