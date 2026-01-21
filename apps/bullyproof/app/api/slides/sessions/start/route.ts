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
 * Responses:
 * - 201 Created: Returns the created session.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { slideViewingSessionsRepo } from "@/server/slide-viewing-sessions/slide-viewing-sessions.repo";
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
