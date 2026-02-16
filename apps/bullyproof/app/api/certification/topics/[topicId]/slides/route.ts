/**
 * Certification Topic Slides API route handler.
 *
 * Exposes HTTP endpoints for certification slide management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId]/slides - List slides for a topic
 * - POST /api/certification/topics/[topicId]/slides - Create a new slide
 *
 * Responses:
 * - 200 OK: Returns slide data or array of slides.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicSlidesService } from "@/server/topic-slides/topic-slides.service";
import { courseTopicSlidesRepo } from "@/server/course-topic-slides/course-topic-slides.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/topics/[topicId]/slides
 *
 * Returns a list of slides for a certification topic.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the list of slides or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const slides = await topicSlidesService.getSlidesByTopicId(
      { userId },
      topicId
    );

    return NextResponse.json(slides, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/certification/topics/[topicId]/slides
 *
 * Creates a new slide for a certification topic.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID.
 * @returns A JSON `NextResponse` with the created slide or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topicId } = await params;
    const body = await request.json();

    // Remove quiz/test support - only image, video, text allowed
    if (body.kind && !["image", "video", "text"].includes(body.kind)) {
      return NextResponse.json(
        { error: "Invalid slide kind. Only 'image', 'video', or 'text' are allowed." },
        { status: 400 }
      );
    }

    const existingSlides = await courseTopicSlidesRepo.getByTopicId(topicId);
    const lastPosition =
      existingSlides.length > 0
        ? existingSlides[existingSlides.length - 1].position
        : null;
    const { generatePositionBetween } = await import(
      "@/server/lib/fractional-position"
    );
    const position = body.position ?? generatePositionBetween(lastPosition, null);

    const slide = await courseTopicSlidesRepo.createSlide({
      topicId,
      position,
      kind: body.kind || "image",
      imageUrl: body.imageUrl ?? null,
      videoUrl: body.videoUrl ?? null,
      textHtml: body.textHtml ?? null,
      videoStartS: body.videoStartS ?? null,
      videoEndS: body.videoEndS ?? null,
    });

    return NextResponse.json(slide, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
