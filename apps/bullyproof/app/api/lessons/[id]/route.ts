/**
 * Lesson by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific lessons by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Teachers can manage their own lessons, school admins can manage school lessons.
 *
 * Endpoints:
 * - GET /api/lessons/[id] - Get lesson by ID
 * - PUT /api/lessons/[id] - Update lesson by ID
 * - DELETE /api/lessons/[id] - Delete lesson by ID
 *
 * Responses:
 * - 200 OK: Returns lesson data or updated lesson.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when lesson is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons/[id]
 *
 * Returns a specific lesson's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the lesson data or an error payload.
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

    const { id } = await params;
    const lessonData = await lessonsService.getLessonById({ userId }, { id });

    if (!lessonData) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    return NextResponse.json(lessonData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status =
      e.message?.includes("Unauthorized") || e.message?.includes("permission")
        ? 403
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle PUT /api/lessons/[id]
 *
 * Updates a specific lesson by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the updated lesson or an error payload.
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

    const { id } = await params;
    const body = await request.json();
    const updatedLesson = await lessonsService.updateLesson({ userId }, id, body);
    return NextResponse.json(updatedLesson, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/lessons/[id]
 *
 * Deletes a specific lesson by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await lessonsService.deleteLesson({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
