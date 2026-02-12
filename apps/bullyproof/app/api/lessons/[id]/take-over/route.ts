/**
 * Lesson Take Over API route handler.
 *
 * POST /api/lessons/[id]/take-over - Take over ownership of a lesson
 *
 * Only TEACHER at the lesson's school can take over. Blocked when status is feedback/completed/cancelled.
 */
import { NextResponse } from "next/server";
import { lessonsService } from "@/server/lessons/lessons.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: lessonId } = await params;
    const lesson = await lessonsService.takeOverLesson({ userId }, lessonId);
    return NextResponse.json(lesson, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Internal error";
    const status =
      message.includes("Unauthorized") ? 401
      : message.includes("not found") ? 404
      : message.includes("cannot take over") || message.includes("already the owner") || message.includes("must be a teacher")
        ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
