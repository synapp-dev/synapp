/**
 * Topic Lesson Plan download API route.
 * Streams the PDF with Content-Disposition: attachment to trigger a save dialog.
 */
import { NextResponse } from "next/server";
import { topicLessonPlansService } from "@/server/topic-lesson-plans/topic-lesson-plans.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

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
    const { url, fileName } = await topicLessonPlansService.getSignedUrl(
      { userId },
      id
    );

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    const disposition = `attachment; filename="${fileName.replace(/"/g, '\\"')}"`;

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal error";
    console.error("[topic-lesson-plans] download error:", e);
    const status = message === "Lesson plan not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
