/**
 * Teacher Classes Schools API route handler.
 *
 * Exposes HTTP endpoints for getting school IDs where a user has classes.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/me/teacher-classes/schools - Get school IDs where current user has classes
 *
 * Responses:
 * - 200 OK: Returns `{ schoolIds: string[] }`.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/server/db/drizzle";
import { teacherClasses, classes } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle GET /api/me/teacher-classes/schools
 *
 * Returns school IDs where the current user has classes assigned.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with schoolIds array or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get distinct school IDs where user has classes
    // Join teacher_classes with classes to get schoolId
    const result = await db
      .select({
        schoolId: classes.schoolId,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .where(eq(teacherClasses.userId, userId));

    // Get unique school IDs
    const schoolIds = Array.from(new Set(result.map((row) => row.schoolId)));

    return NextResponse.json({ schoolIds }, { status: 200 });
  } catch (e: any) {
    console.error("[TEACHER_CLASSES_SCHOOLS GET] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
