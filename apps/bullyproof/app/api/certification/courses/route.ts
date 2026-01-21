/**
 * Certification Courses API route handler.
 *
 * Exposes HTTP endpoints for certification course management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/certification/courses - List certification courses
 * - POST /api/certification/courses - Create a new certification course (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns certification course data or array of courses.
 * - 201 Created: Returns the created certification course.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationCoursesService } from "@/server/certification-courses/certification-courses.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/courses
 *
 * Returns a list of certification courses.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of courses or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const courses = await certificationCoursesService.getCourses({ userId }, query);
    return NextResponse.json(courses, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/certification/courses
 *
 * Creates a new certification course.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created course or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newCourse = await certificationCoursesService.createCourse({ userId }, body);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
