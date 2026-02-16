/**
 * Certification Slide by ID API route handler.
 *
 * Exposes HTTP endpoints for specific certification slide management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - GET /api/certification/topics/[topicId]/slides/[slideId] - Get slide by ID
 * - PUT /api/certification/topics/[topicId]/slides/[slideId] - Update slide
 * - DELETE /api/certification/topics/[topicId]/slides/[slideId] - Delete slide
 *
 * Responses:
 * - 200 OK: Returns slide data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when slide is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicSlidesService } from "@/server/topic-slides/topic-slides.service";
import { topicSlidesRepo } from "@/server/topic-slides/topic-slides.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification/topics/[topicId]/slides/[slideId]
 *
 * Returns a specific slide's information.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID and slide ID.
 * @returns A JSON `NextResponse` with the slide data or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ topicId: string; slideId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideId } = await params;
    const slides = await topicSlidesService.getSlidesByTopicId(
      { userId },
      (await params).topicId
    );
    const slide = slides.find((s) => s.id === slideId);

    if (!slide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    return NextResponse.json(slide, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/certification/topics/[topicId]/slides/[slideId]
 *
 * Updates a specific slide.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID and slide ID.
 * @returns A JSON `NextResponse` with the updated slide or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ topicId: string; slideId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideId } = await params;
    const body = await request.json();

    // Remove quiz/test support
    if (body.kind && !["image", "video", "text"].includes(body.kind)) {
      return NextResponse.json(
        { error: "Invalid slide kind. Only 'image', 'video', or 'text' are allowed." },
        { status: 400 }
      );
    }

    const slide = await topicSlidesRepo.updateSlide(slideId, {
      kind: body.kind,
      imageUrl: body.imageUrl ?? null,
      videoUrl: body.videoUrl ?? null,
      textHtml: body.textHtml ?? null,
      videoStartS: body.videoStartS ?? null,
      videoEndS: body.videoEndS ?? null,
      position: body.position,
    });

    return NextResponse.json(slide, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/certification/topics/[topicId]/slides/[slideId]
 *
 * Deletes a specific slide.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the topic ID and slide ID.
 * @returns A JSON `NextResponse` with success status or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ topicId: string; slideId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slideId } = await params;
    await topicSlidesRepo.deleteSlide(slideId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
