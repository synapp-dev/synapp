/**
 * Course Certificate download route handler.
 *
 * GET /api/certification/courses/[id]/certificate - the caller's completion
 * certificate as a PDF attachment. Requires the course to be completed by the
 * authenticated user; issues the certificate timestamp on first download.
 */
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@/utils/supabase/server";
import { db } from "@/server/db/drizzle";
import { certificationCourses, userProfile } from "@/server/db/schema";
import { courseProgressRepo } from "@/server/course-progress/course-progress.repo";
import { renderCourseCertificatePdf } from "@/server/certificates/certificate-pdf";

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

    const [course] = await db
      .select()
      .from(certificationCourses)
      .where(eq(certificationCourses.id, courseId))
      .limit(1);
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const [progress] = await courseProgressRepo.getByUserAndCourse(
      user.id,
      courseId
    );
    if (!progress || progress.status !== "completed") {
      return NextResponse.json(
        { error: "Certificate is available once the course is completed" },
        { status: 403 }
      );
    }

    // Issue on first download for progress rows completed before issuance was wired.
    if (!progress.certificateIssuedAt) {
      await courseProgressRepo.markCertificateIssued(user.id, courseId);
    }

    const [profile] = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, user.id))
      .limit(1);

    const firstName = profile?.firstName ?? "";
    const lastName = profile?.lastName ?? "";
    const displayFirst = firstName || profile?.email?.split("@")[0] || "User";

    const pdfBytes = await renderCourseCertificatePdf({
      firstName: displayFirst,
      lastName,
      courseName: course.name,
      certificateType: course.certificateType,
      completedAt: progress.completedAt ?? new Date().toISOString(),
    });

    const safeName = `${displayFirst}-${lastName}`
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // ?view=1 renders the PDF in the browser tab; default forces a download.
    const wantsInlineView =
      request.nextUrl.searchParams.get("view") === "1";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${wantsInlineView ? "inline" : "attachment"}; filename="AP-Certificate-${safeName || "certificate"}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/certification/courses/[id]/certificate]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
