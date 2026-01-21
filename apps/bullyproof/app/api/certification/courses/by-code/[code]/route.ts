/**
 * Certification Course by Code API route handler.
 *
 * Exposes HTTP endpoints for specific certification course management by code.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 *
 * Endpoints:
 * - GET /api/certification/courses/by-code/[code] - Get certification course by code
 *
 * Responses:
 * - 200 OK: Returns certification course data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when course is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationCoursesService } from "@/server/certification-courses/certification-courses.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/courses/by-code/[code]
 *
 * Returns a specific certification course's information by code.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course code.
 * @returns A JSON `NextResponse` with the course data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const courseData = await certificationCoursesService.getCourseByCode(
      { userId },
      { code }
    );

    if (!courseData) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(courseData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
