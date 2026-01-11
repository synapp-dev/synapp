/**
 * Teacher Classes API route handler.
 *
 * Exposes HTTP endpoints for checking teacher classes status.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/me/teacher-classes - Check if current user has any teacher classes
 *
 * Responses:
 * - 200 OK: Returns `{ hasClasses: boolean }`.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/server/db/drizzle";
import { teacherClasses } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Handle GET /api/me/teacher-classes
 *
 * Returns whether the current user has any classes in the teacher_classes table.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with hasClasses boolean or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has any teacher classes
    const result = await db
      .select()
      .from(teacherClasses)
      .where(eq(teacherClasses.userId, userId))
      .limit(1);

    const hasClasses = result.length > 0;

    return NextResponse.json({ hasClasses }, { status: 200 });
  } catch (e: any) {
    console.error("[TEACHER_CLASSES GET] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
