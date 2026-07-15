/**
 * My Certificates route handler.
 *
 * GET /api/me/certificates - the caller's completed certification courses,
 * for the profile Certificates card.
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireRequestUser } from "@/lib/api/route-auth";
import { db } from "@/server/db/drizzle";
import { certificationCourses, courseProgress } from "@/server/db/schema";

export async function GET() {
  try {
    const { user, errorResponse } = await requireRequestUser();
    if (errorResponse) return errorResponse;

    const rows = await db
      .select({
        courseId: courseProgress.courseId,
        courseName: certificationCourses.name,
        certificateType: certificationCourses.certificateType,
        completedAt: courseProgress.completedAt,
        certificateIssuedAt: courseProgress.certificateIssuedAt,
      })
      .from(courseProgress)
      .innerJoin(
        certificationCourses,
        eq(certificationCourses.id, courseProgress.courseId)
      )
      .where(
        and(
          eq(courseProgress.userId, user.id),
          eq(courseProgress.status, "completed")
        )
      )
      .orderBy(certificationCourses.sortIndex);

    return NextResponse.json({ certificates: rows }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/me/certificates]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
