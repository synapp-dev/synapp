/**
 * Get In-Progress Quiz Attempt API route handler.
 *
 * Exposes HTTP endpoints for checking if a user has an in-progress quiz attempt for a topic.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can check their own quiz attempts.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId]/quiz-in-progress - Get in-progress quiz attempt for a topic
 *
 * Responses:
 * - 200 OK: Returns the in-progress attempt or null.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { requireRequestUser } from "@/lib/api/route-auth";

/**
 * Handle GET /api/certification/topics/[topicId]/quiz-in-progress
 *
 * Returns the in-progress quiz attempt for the authenticated user and specified topic.
 * Returns null if no in-progress attempt exists.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the in-progress attempt or null, or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const { topicId } = await params;

    // Get in-progress quiz attempt for this topic
    const inProgressAttempt = await quizAttemptsRepo.getInProgressAttemptByTopic(
      user.id,
      topicId
    );

    return NextResponse.json(inProgressAttempt, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
