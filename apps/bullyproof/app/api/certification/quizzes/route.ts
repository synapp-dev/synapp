/**
 * Topic Quizzes API route handler.
 *
 * Exposes HTTP endpoints for quiz management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage quizzes.
 *
 * Endpoints:
 * - GET /api/certification/quizzes?topicId=xxx - List quizzes for a topic
 * - POST /api/certification/quizzes - Create a new quiz
 *
 * Responses:
 * - 200 OK: Returns quiz data or array of quizzes.
 * - 201 Created: Returns the created quiz.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { courseTopicQuizzesRepo } from "@/server/course-topic-quizzes/course-topic-quizzes.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId query parameter is required" },
        { status: 400 }
      );
    }

    const quizzes = await courseTopicQuizzesRepo.getByTopicId(topicId);
    return NextResponse.json(quizzes, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roles = await getUserScopedRoles(userId);
    if (!roles.platform.includes("PLATFORM_ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized to manage quizzes" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const quiz = await courseTopicQuizzesRepo.create(body);
    return NextResponse.json(quiz[0], { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
