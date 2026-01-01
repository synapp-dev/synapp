/**
 * Lesson Feedback API route handler.
 *
 * Exposes HTTP endpoints for managing lesson feedback.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Only the lesson creator can submit/view feedback for their lessons.
 *
 * Endpoints:
 * - GET /api/lessons/[id]/feedback - Get feedback for a lesson
 * - POST /api/lessons/[id]/feedback - Create feedback for a lesson
 * - PUT /api/lessons/[id]/feedback - Update feedback for a lesson
 *
 * Responses:
 * - 200 OK: Returns feedback data or updated feedback.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when feedback or lesson not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { lessonFeedbackService } from "@/server/lesson-feedback/lesson-feedback.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons/[id]/feedback
 *
 * Returns feedback for a specific lesson.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the feedback or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const feedback = await lessonFeedbackService.getFeedbackByLessonId(
      { userId },
      { lessonId }
    );

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json(feedback, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized") ? 401 : e.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle POST /api/lessons/[id]/feedback
 *
 * Creates feedback for a specific lesson.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the created feedback or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const body = await request.json();

    const feedback = await lessonFeedbackService.createFeedback(
      { userId },
      {
        lessonId,
        rating: body.rating,
        comments: body.comments,
      }
    );

    return NextResponse.json(feedback, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized") ? 401 : e.message?.includes("already exists") ? 409 : e.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle PUT /api/lessons/[id]/feedback
 *
 * Updates feedback for a specific lesson.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the updated feedback or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const body = await request.json();

    const feedback = await lessonFeedbackService.updateFeedback(
      { userId },
      lessonId,
      {
        rating: body.rating,
        comments: body.comments,
      }
    );

    return NextResponse.json(feedback, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized") ? 401 : e.message?.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

