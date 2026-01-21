/**
 * Quiz Attempt by ID API route handler.
 *
 * Exposes HTTP endpoints for specific quiz attempt management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only access their own attempts.
 *
 * Endpoints:
 * - GET /api/certification/quizzes/[quizId]/attempts/[attemptId] - Get attempt by ID
 * - PUT /api/certification/quizzes/[quizId]/attempts/[attemptId] - Update attempt
 *
 * Responses:
 * - 200 OK: Returns attempt data or updated attempt.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when attempt is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { quizAttemptsRepo } from "@/server/quiz-attempts/quiz-attempts.repo";
import { createServerClient } from "@/utils/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    const attempts = await quizAttemptsRepo.getById(attemptId);

    if (attempts.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Verify ownership
    if (attempts[0].userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(attempts[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attemptId } = await params;
    const attempts = await quizAttemptsRepo.getById(attemptId);

    if (attempts.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Verify ownership
    if (attempts[0].userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // For now, just return the attempt (updates handled by submit endpoint)
    return NextResponse.json(attempts[0], { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
