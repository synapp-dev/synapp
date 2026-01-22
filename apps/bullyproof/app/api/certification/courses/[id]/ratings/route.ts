/**
 * Course Ratings API route handler.
 *
 * Exposes HTTP endpoints for submitting and updating course ratings.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only rate courses they have access to.
 *
 * Endpoints:
 * - POST /api/certification/courses/[id]/ratings - Submit/update rating
 *
 * Responses:
 * - 200 OK: Returns the created/updated rating object.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 400 Bad Request: `{ error: string }` when rating is invalid.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseRatingsRepo } from "@/server/course-ratings/course-ratings.repo";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: courseId } = await params;
    const body = await request.json();
    const { rating, comment, questionMetadata } = body;

    // Validate rating
    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Validate comment if provided
    if (comment !== undefined && comment !== null && typeof comment !== "string") {
      return NextResponse.json(
        { error: "Comment must be a string" },
        { status: 400 }
      );
    }

    // Validate questionMetadata if provided
    if (questionMetadata !== undefined && questionMetadata !== null) {
      if (typeof questionMetadata !== "object" || Array.isArray(questionMetadata)) {
        return NextResponse.json(
          { error: "questionMetadata must be an object" },
          { status: 400 }
        );
      }
    }

    // Upsert rating (create or update)
    const result = await courseRatingsRepo.upsert(
      user.id,
      courseId,
      rating,
      comment || null,
      questionMetadata || null
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Error submitting course rating:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
