/**
 * Topic Lesson Plans API route handler.
 *
 * Endpoints:
 * - GET /api/topic-lesson-plans?topicId=... - List lesson plans for a topic
 * - POST /api/topic-lesson-plans - Upload a lesson plan (multipart: file + topicId)
 */
import { NextResponse } from "next/server";
import { topicLessonPlansService } from "@/server/topic-lesson-plans/topic-lesson-plans.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get("topicId");

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId query parameter is required" },
        { status: 400 }
      );
    }

    const plans = await topicLessonPlansService.list({ userId }, topicId);
    return NextResponse.json(plans, { status: 200 });
  } catch (e: any) {
    console.error("[topic-lesson-plans] GET error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const topicId = formData.get("topicId") as string;
    const file = formData.get("file") as File | null;

    if (!topicId) {
      return NextResponse.json(
        { error: "topicId is required" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    const plan = await topicLessonPlansService.upload(
      { userId },
      topicId,
      file
    );

    return NextResponse.json(plan, { status: 201 });
  } catch (e: any) {
    console.error("[topic-lesson-plans] POST error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
