/**
 * End Slide Viewing Session API route handler.
 *
 * Exposes HTTP endpoints for ending a viewing session and updating total time.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only end their own sessions.
 *
 * Endpoints:
 * - POST /api/slides/sessions/end - End a viewing session
 *
 * Responses:
 * - 200 OK: Returns the ended session with duration.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when session is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { slideViewingSessionsRepo } from "@/server/slide-viewing-sessions/slide-viewing-sessions.repo";
import { userSlideViewsRepo } from "@/server/user-slide-views/user-slide-views.repo";
import { createServerClient } from "@/utils/supabase/server";

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

    // End session
    const ended = await slideViewingSessionsRepo.endSession(sessionId);
    const finalSession = ended[0];

    // Update total time for this slide
    const totalTime = await slideViewingSessionsRepo.getTotalTimeForSlide(
      user.id,
      body.slideId
    );
    await userSlideViewsRepo.updateTotalTime(
      user.id,
      body.slideId,
      totalTime
    );

    return NextResponse.json(finalSession, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
