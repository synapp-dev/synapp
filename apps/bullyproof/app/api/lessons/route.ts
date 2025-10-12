/**
 * Lessons API route handler.
 *
 * Exposes HTTP endpoints for lesson management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires teacher role for management operations.
 *
 * Endpoints:
 * - GET /api/lessons - List lessons (filtered by teacher/class for non-platform admins)
 * - POST /api/lessons - Create a new lesson
 *
 * Responses:
 * - 200 OK: Returns lesson data or array of lessons.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons
 *
 * Returns a list of lessons visible to the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of lessons or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const lessons = await lessonsService.listLessons({ userId }, query);
    return NextResponse.json(lessons, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/lessons
 *
 * Creates a new lesson.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created lesson or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newLesson = await lessonsService.createLesson({ userId }, body);
    return NextResponse.json(newLesson, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
