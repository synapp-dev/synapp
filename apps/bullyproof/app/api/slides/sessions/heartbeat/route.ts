/**
 * Slide Viewing Session Heartbeat API route handler.
 *
 * Exposes HTTP endpoints for sending heartbeat updates to a viewing session.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only update their own sessions.
 *
 * Endpoints:
 * - POST /api/slides/sessions/heartbeat - Send heartbeat update
 *
 * Request body:
 * - { sessionId: string, slideId: string }
 *
 * Responses:
 * - 200 OK: Returns the updated session.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when session is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { slideViewingSessionsRepo } from "@/server/slide-viewing-sessions/slide-viewing-sessions.repo";
import { createServerClient } from "@/utils/supabase/server";

/**
 * Handle POST /api/slides/sessions/heartbeat
 *
 * Sends a heartbeat update to keep a slide viewing session active.
 * Updates the last activity timestamp for the session.
 *
 * @param request The incoming HTTP request containing sessionId and slideId.
 * @returns A JSON `NextResponse` with the updated session or an error payload.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    // Verify session exists and belongs to user
    const sessions = await slideViewingSessionsRepo.getSessionsForSlide(
      user.id,
      body.slideId
    );
    const session = sessions.find((s) => s.id === sessionId);

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update activity
    const updated = await slideViewingSessionsRepo.updateActivity(sessionId);
    return NextResponse.json(updated[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
