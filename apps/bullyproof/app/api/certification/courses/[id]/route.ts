/**
 * Certification Course by ID API route handler.
 *
 * Exposes HTTP endpoints for specific certification course management by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read certification data.
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/certification/courses/[id] - Get certification course by ID
 * - PUT /api/certification/courses/[id] - Update certification course (platform admin only)
 * - DELETE /api/certification/courses/[id] - Delete certification course (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns certification course data or updated course.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when course is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationCoursesService } from "@/server/certification-courses/certification-courses.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/courses/[id]
 *
 * Returns a specific certification course's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with the course data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const courseData = await certificationCoursesService.getCourseById(
      { userId },
      { id }
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

/**
 * Handle PUT /api/certification/courses/[id]
 *
 * Updates a specific certification course's information.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with the updated course data or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updatedCourse = await certificationCoursesService.updateCourse(
      { userId },
      { id, ...body }
    );

    return NextResponse.json(updatedCourse, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized")
      ? 403
      : e.message?.includes("not found")
        ? 404
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle DELETE /api/certification/courses/[id]
 *
 * Deletes a specific certification course.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the course ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await certificationCoursesService.deleteCourse({ userId }, { id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized")
      ? 403
      : e.message?.includes("not found")
        ? 404
        : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
