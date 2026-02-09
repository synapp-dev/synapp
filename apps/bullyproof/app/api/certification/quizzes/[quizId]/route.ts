/**
 * Topic Quiz by ID API route handler.
 *
 * Exposes HTTP endpoints for specific quiz management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage quizzes.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId] - Get quiz by ID
 * - PUT /api/certification/quizzes/[quizId] - Update quiz
 * - DELETE /api/certification/quizzes/[quizId] - Delete quiz
 *
 * Responses:
 * - 200 OK: Returns quiz data or updated quiz.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when quiz is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
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
    // Use enriched view to get quiz with all questions and answers in one query
    const enrichedQuizzes = await courseTopicQuizzesRepo.getByIdEnriched(quizId);

    if (enrichedQuizzes.length === 0) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json(enrichedQuizzes[0], { status: 200 });
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
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "/ap-certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to manage quizzes" },
        { status: 403 }
      );
    }

    const { quizId } = await params;
    const body = await request.json();

    const quiz = await courseTopicQuizzesRepo.update(quizId, body);
    return NextResponse.json(quiz[0], { status: 200 });
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
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "/ap-certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized to manage quizzes" },
        { status: 403 }
      );
    }

    const { quizId } = await params;
    await courseTopicQuizzesRepo.delete(quizId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
