/**
 * User Classes API route handler.
 *
 * Exposes HTTP endpoints for classes assigned to a user (teacher).
 *
 * Authentication:
 * - GET: Platform admins, self, or school admins (with school:manage-school-user-roles) at a school.
 * - POST: Platform admins or school admins at the class's school.
 *
 * Endpoints:
 * - GET /api/users/[id]/classes - Get classes assigned to a user (?schoolId= optional)
 * - POST /api/users/[id]/classes - Add or remove a class (body: { classId, action: "add"|"remove" })
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import {
  canManageSchoolUsers,
  getSchoolsUserCanManage,
} from "@/server/lib/can-manage-school-users";
import { db } from "@/server/db/drizzle";
import { teacherClasses, classes, schools } from "@/server/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { z } from "zod";

const postBodySchema = z.object({
  classId: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

/**
 * Handle GET /api/users/[id]/classes
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
    const { searchParams } = new URL(request.url);
    const schoolIdParam = searchParams.get("schoolId") || undefined;

    // Allow: platform admin, self, or school admin with access
    const allowedSchoolIds = await getSchoolsUserCanManage(userId);
    const isSelf = userId === targetUserId;

    if (!isSelf && allowedSchoolIds !== null) {
      if (allowedSchoolIds.length === 0) {
        return NextResponse.json(
          { error: "Forbidden: You can only view your own classes" },
          { status: 403 }
        );
      }
    }

    let whereClause:
      | ReturnType<typeof eq>
      | ReturnType<typeof and> = eq(teacherClasses.userId, targetUserId);
    if (
      allowedSchoolIds !== null &&
      allowedSchoolIds.length > 0 &&
      !schoolIdParam
    ) {
      // School admin: filter to schools they can manage
      whereClause = and(
        eq(teacherClasses.userId, targetUserId),
        inArray(classes.schoolId, allowedSchoolIds)
      );
    } else if (schoolIdParam) {
      // Optional filter by school - school admins must have access to that school
      if (
        !isSelf &&
        allowedSchoolIds !== null &&
        !allowedSchoolIds.includes(schoolIdParam)
      ) {
        return NextResponse.json(
          { error: "Forbidden: No access to this school" },
          { status: 403 }
        );
      }
      whereClause = and(
        eq(teacherClasses.userId, targetUserId),
        eq(classes.schoolId, schoolIdParam)
      );
    }

    const result = await db
      .select({
        classId: classes.id,
        className: classes.name,
        classCode: classes.code,
        schoolId: classes.schoolId,
        schoolSlug: schools.slug,
        schoolName: schools.name,
        active: classes.active,
        createdAt: teacherClasses.createdAt,
      })
      .from(teacherClasses)
      .innerJoin(classes, eq(teacherClasses.classId, classes.id))
      .leftJoin(schools, eq(classes.schoolId, schools.id))
      .where(whereClause)
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

/**
 * Handle POST /api/users/[id]/classes
 * Body: { classId: string, action: "add" | "remove" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    const data = postBodySchema.parse(body);

    // Get the class to verify it exists and get its schoolId
    const [classRow] = await db
      .select({ id: classes.id, schoolId: classes.schoolId })
      .from(classes)
      .where(eq(classes.id, data.classId))
      .limit(1);

    if (!classRow) {
      return NextResponse.json(
        { error: "Class not found" },
        { status: 404 }
      );
    }

    const canManage = await canManageSchoolUsers(userId, classRow.schoolId);
    if (!canManage) {
      return NextResponse.json(
        { error: "Unauthorized to manage classes at this school" },
        { status: 403 }
      );
    }

    if (data.action === "add") {
      await db
        .insert(teacherClasses)
        .values({
          userId: targetUserId,
          classId: data.classId,
        })
        .onConflictDoNothing();
    } else {
      await db
        .delete(teacherClasses)
        .where(
          and(
            eq(teacherClasses.userId, targetUserId),
            eq(teacherClasses.classId, data.classId)
          )
        );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[USER CLASSES POST] Error:", e);

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
