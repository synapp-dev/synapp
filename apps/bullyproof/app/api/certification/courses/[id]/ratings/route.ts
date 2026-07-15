/**
 * Course Ratings API route handler.
 *
 * Exposes HTTP endpoints for submitting and updating course ratings.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only rate courses they have access to.
 * - GET endpoint requires platform admin permissions.
 *
 * Endpoints:
 * - GET /api/certification/courses/[id]/ratings - Get all ratings for a course (admin only)
 * - POST /api/certification/courses/[id]/ratings - Submit/update rating
 *
 * Request body (POST):
 * - { rating: number (1-5), comment?: string, questionMetadata?: object }
 *
 * Responses:
 * - 200 OK: Returns the created/updated rating object or array of ratings.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks permissions.
 * - 400 Bad Request: `{ error: string }` when rating is invalid.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireRequestUser } from "@/lib/api/route-auth";
import { courseRatingsRepo } from "@/server/course-ratings/course-ratings.repo";
import { checkFeatureAccess } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/server/db/drizzle";
import { courseRatings, userProfile, userRoles, schools } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Handle GET /api/certification/courses/[id]/ratings
 *
 * Returns all ratings for a course with user and school information.
 * Only accessible to platform admins.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with array of ratings or an error payload.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAccess = await checkFeatureAccess(userId, "/ap-certification");
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const { id: courseId } = await params;

    // Fetch all ratings for this course with user and school information
    const ratingsWithUserInfo = await db
      .select({
        id: courseRatings.id,
        userId: courseRatings.userId,
        courseId: courseRatings.courseId,
        rating: courseRatings.rating,
        comment: courseRatings.comment,
        createdAt: courseRatings.createdAt,
        updatedAt: courseRatings.updatedAt,
        questionMetadata: courseRatings.questionMetadata,
        userEmail: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        schools: sql<string[]>`COALESCE(
          array_agg(DISTINCT ${schools.name}) FILTER (WHERE ${schools.name} IS NOT NULL),
          ARRAY[]::text[]
        )`,
      })
      .from(courseRatings)
      .leftJoin(userProfile, eq(courseRatings.userId, userProfile.id))
      .leftJoin(userRoles, eq(userProfile.id, userRoles.userId))
      .leftJoin(schools, eq(userRoles.schoolId, schools.id))
      .where(eq(courseRatings.courseId, courseId))
      .groupBy(
        courseRatings.id,
        courseRatings.userId,
        courseRatings.courseId,
        courseRatings.rating,
        courseRatings.comment,
        courseRatings.createdAt,
        courseRatings.updatedAt,
        courseRatings.questionMetadata,
        userProfile.email,
        userProfile.firstName,
        userProfile.lastName
      )
      .orderBy(sql`${courseRatings.createdAt} DESC`);

    // Format the response with user name
    const formattedRatings = ratingsWithUserInfo.map((rating) => {
      // Ensure firstName and lastName are strings (not null)
      const firstName = rating.firstName || null;
      const lastName = rating.lastName || null;
      
      const userName = firstName && lastName
        ? `${firstName} ${lastName}`.trim()
        : firstName || lastName || rating.userEmail || "Unknown User";

      return {
        id: rating.id,
        userId: rating.userId,
        courseId: rating.courseId,
        rating: rating.rating,
        comment: rating.comment,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        questionMetadata: rating.questionMetadata,
        userName,
        firstName,
        lastName,
        schools: Array.isArray(rating.schools) ? rating.schools : [],
      };
    });

    return NextResponse.json(formattedRatings, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching course ratings:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/certification/courses/[id]/ratings
 *
 * Submits or updates a course rating. Creates a new rating if one doesn't exist,
 * or updates the existing rating for the user and course.
 *
 * @param request The incoming HTTP request containing rating, comment, and questionMetadata.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with the created/updated rating or an error payload.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

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
