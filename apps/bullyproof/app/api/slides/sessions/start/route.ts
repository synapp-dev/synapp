/**
 * Start Slide Viewing Session API route handler.
 *
 * Exposes HTTP endpoints for starting a slide viewing session.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can start viewing sessions.
 *
 * Endpoints:
 * - POST /api/slides/sessions/start - Start a new viewing session
 *
 * Request body:
 * - { slideId: string, topicId: string, courseId: string }
 *
 * Responses:
 * - 201 Created: Returns the created session.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { slideViewingSessionsRepo } from "@/server/slide-viewing-sessions/slide-viewing-sessions.repo";
import { requireRequestUser } from "@/lib/api/route-auth";

/**
 * Handle POST /api/slides/sessions/start
 *
 * Starts a new slide viewing session. Ends any existing active session for the same slide
 * before creating a new one.
 *
 * @param request The incoming HTTP request containing slideId, topicId, and courseId.
 * @returns A JSON `NextResponse` with the created session or an error payload.
 */
export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { slideId, topicId, courseId } = body;

    // End any existing active session for this slide
    const activeSession = await slideViewingSessionsRepo.getActiveSession(
      user.id,
      slideId
    );

    if (activeSession.length > 0) {
      await slideViewingSessionsRepo.endSession(activeSession[0].id);
    }

    // Start new session
    const session = await slideViewingSessionsRepo.startSession({
      userId: user.id,
      slideId,
      topicId,
      courseId,
    });

    return NextResponse.json(session[0], { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
