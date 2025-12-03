/**
 * Topic Slide by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific topic slides by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - PUT /api/topic-slides/[id] - Update slide by ID
 * - DELETE /api/topic-slides/[id] - Delete slide by ID
 *
 * Responses:
 * - 200 OK: Returns updated slide data (PUT) or success object (DELETE).
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when slide is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle PUT /api/topic-slides/[id]
 *
 * Updates a specific slide by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the slide ID.
 * @returns A JSON `NextResponse` with the updated slide or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const updatedSlide = await topicsService.updateSlide({ userId }, id, body);

    if (!updatedSlide) {
      return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    }

    return NextResponse.json(updatedSlide, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/topic-slides/[id]
 *
 * Deletes a specific slide by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the slide ID.
 * @returns A JSON `NextResponse` with a success object or an error payload.
 */
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
    await topicsService.deleteSlide({ userId }, id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
