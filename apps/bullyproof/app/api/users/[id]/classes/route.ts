/**
 * User Classes API route handler.
 *
 * Exposes HTTP endpoint for getting classes assigned to a user (teacher).
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can view any user's classes.
 *
 * Endpoints:
 * - GET /api/users/[id]/classes - Get classes assigned to a user
 *
 * Responses:
 * - 200 OK: Returns array of classes with school information.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import { teacherClasses, classes, schools } from "@/server/db/schema";
import { eq, asc } from "drizzle-orm";

/**
 * Handle GET /api/users/[id]/classes
 *
 * Returns classes assigned to a specific user, grouped by school.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the user ID.
 * @returns A JSON `NextResponse` with classes data or an error payload.
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

    const { id: targetUserId } = await params;

    // Check permissions - platform admins can view any user's classes
    const isPlatformAdmin = await checkFeatureAccess(userId, "/admin/users");

    if (!isPlatformAdmin && userId !== targetUserId) {
      return NextResponse.json(
        { error: "Forbidden: You can only view your own classes" },
        { status: 403 }
      );
    }

    // Get classes assigned to this user with school information
    const result = await db
      .select({
        classId: classes.id,
        className: classes.name,
        classCode: classes.code,
        schoolId: classes.schoolId,
        schoolName: schools.name,
        active: classes.active,
        createdAt: teacherClasses.createdAt,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .leftJoin(schools, eq(classes.schoolId, schools.id))
      .where(eq(teacherClasses.userId, targetUserId))
      .orderBy(asc(classes.name));

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[USER CLASSES GET] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
