/**
 * Course Rating Check API route handler.
 *
 * Exposes HTTP endpoints for checking if a user has rated a course.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/certification/courses/[id]/ratings/check - Check if user has rated
 *
 * Responses:
 * - 200 OK: Returns `{ hasRated: boolean, rating?: { id, rating, comment, createdAt } }`.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/utils/supabase/server";
import { courseRatingsRepo } from "@/server/course-ratings/course-ratings.repo";

/**
 * Handle GET /api/certification/courses/[id]/ratings/check
 *
 * Checks if the authenticated user has rated the specified course.
 * Returns the rating details if one exists.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with hasRated flag and optional rating data or an error payload.
 */
export async function GET(
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

    // Check if user has rated this course
    const existingRating = await courseRatingsRepo.getByUserAndCourse(
      user.id,
      courseId
    );

    if (existingRating.length === 0) {
      return NextResponse.json({ hasRated: false }, { status: 200 });
    }

    const rating = existingRating[0];
    return NextResponse.json(
      {
        hasRated: true,
        rating: {
          id: rating.id,
          rating: rating.rating,
          comment: rating.comment,
          createdAt: rating.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error checking course rating:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
