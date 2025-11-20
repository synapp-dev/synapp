/**
 * Lesson Live State API route handler.
 *
 * Exposes HTTP endpoints for managing lesson live state.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - POST /api/lessons/[id]/live-state - Update lesson live state
 *
 * Responses:
 * - 200 OK: Returns updated live state.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when lesson is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { lessonLiveStateRepo } from "@/server/lessons/lesson-live-state.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/lessons/[id]/live-state
 *
 * Gets the current live state and slides for a lesson.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the live state and slides or an error payload.
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

    // Get live state and slides
    const [liveState, slides] = await Promise.all([
      lessonLiveStateRepo.getLiveState(lessonId),
      lessonLiveStateRepo.getLessonSlides(lessonId),
    ]);

    return NextResponse.json(
      {
        liveState,
        slides,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/lessons/[id]/live-state
 *
 * Updates the live state for a lesson (current slide, index, pause state).
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the lesson ID.
 * @returns A JSON `NextResponse` with the updated live state or an error payload.
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

    // Validate request body
    const { currentSlideId, currentIndex, isPaused } = body;

    if (currentSlideId !== undefined && typeof currentSlideId !== "string") {
      return NextResponse.json(
        { error: "currentSlideId must be a string" },
        { status: 400 }
      );
    }

    if (currentIndex !== undefined && typeof currentIndex !== "number") {
      return NextResponse.json(
        { error: "currentIndex must be a number" },
        { status: 400 }
      );
    }

    if (isPaused !== undefined && typeof isPaused !== "boolean") {
      return NextResponse.json(
        { error: "isPaused must be a boolean" },
        { status: 400 }
      );
    }

    // Update live state
    const updatedState = await lessonLiveStateRepo.updateLiveState(
      lessonId,
      userId,
      {
        currentSlideId,
        currentIndex,
        isPaused,
      }
    );

    return NextResponse.json(updatedState, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

