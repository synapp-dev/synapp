/**
 * Topic Lesson Plan by ID API route handler.
 *
 * Endpoints:
 * - GET /api/topic-lesson-plans/[id] - Get signed download URL
 * - DELETE /api/topic-lesson-plans/[id] - Delete lesson plan
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
    const result = await topicLessonPlansService.getSignedUrl({ userId }, id);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[topic-lesson-plans] GET by ID error:", e);
    const status = e.message === "Lesson plan not found" ? 404 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

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
    const result = await topicLessonPlansService.delete({ userId }, id);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[topic-lesson-plans] DELETE error:", e);
    const status = e.message === "Lesson plan not found" ? 404 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
