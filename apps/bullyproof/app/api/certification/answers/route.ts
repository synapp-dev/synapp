/**
 * Certification Answers API route handler.
 *
 * Exposes HTTP endpoints for submitting certification quiz answers.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can submit answers.
 *
 * Endpoints:
 * - POST /api/certification/answers - Submit or update a quiz answer
 *
 * Request body:
 * - { stageId: string, topicId: string, slideId: string, attemptId?: string, answerId?: string, isCorrect: boolean, timeTaken?: number }
 *
 * Responses:
 * - 200 OK: Returns the submitted answer.
 * - 400 Bad Request: `{ error: string }` when required fields are missing.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 *
 * @deprecated This route uses deprecated schema tables. Migrate to use quizAttemptAnswersRepo and courseTopicProgressRepo.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
// DEPRECATED: These repos use old schema tables that no longer exist
// TODO: Migrate this route to use:
//   - quizAttemptAnswersRepo instead of certificationAnswersRepo
//   - courseTopicProgressRepo instead of certificationTopicProgressRepo
// See: server/certification-answers/certification-answers.repo.ts
// See: server/certification-topic-progress/certification-topic-progress.repo.ts
import { certificationAnswersRepo } from "@/server/certification-answers/certification-answers.repo";
import { certificationTopicProgressRepo } from "@/server/certification-topic-progress/certification-topic-progress.repo";

/**
 * Handle POST /api/certification/answers
 *
 * Submits or updates a quiz answer for a certification topic slide.
 * Marks the slide as answered in progress tracking to unlock the next slide.
 *
 * @param request The incoming HTTP request containing answer data.
 * @returns A JSON `NextResponse` with the submitted answer or an error payload.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const {
      stageId,
      topicId,
      slideId,
      attemptId,
      answerId,
      isCorrect,
      timeTaken,
    } = body;

    if (!stageId || !topicId || !slideId || typeof isCorrect !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Use upsert to update existing answer or create new one
    const answer = await certificationAnswersRepo.upsertAnswer({
      userId: user.id,
      stageId,
      topicId,
      slideId,
      attemptId,
      answerId,
      isCorrect,
      timeTaken,
    });

    // Mark slide as answered in slideProgress to unlock next slide
    if (attemptId) {
      try {
        await certificationTopicProgressRepo.markSlideAnswered(
          attemptId,
          slideId
        );
      } catch (error) {
        // Log error but don't fail the request if marking as answered fails
        console.error("Error marking slide as answered:", error);
      }
    }

    return NextResponse.json({ answer: answer[0] });
  } catch (error) {
    console.error("Error creating answer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

