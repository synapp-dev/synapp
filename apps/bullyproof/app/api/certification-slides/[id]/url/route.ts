/**
 * Certification Slide Image URL API route handler.
 *
 * Exposes HTTP endpoints for getting signed URLs for certification slide images.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can view slide images.
 *
 * Endpoints:
 * - GET /api/certification-slides/[id]/url - Get signed URL for slide image
 *
 * Responses:
 * - 200 OK: Returns signed URL with 1-week expiry: `{ url: string }` or `{ url: null }` if no image exists
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when slide is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationSlidesService } from "@/server/certification-slides/certification-slides.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/certification-slides/[id]/url
 *
 * Returns a signed URL for the certification slide image with 1-week expiry.
 * Returns `{ url: null }` if the slide has no image in the bucket.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the slide ID.
 * @returns A JSON `NextResponse` with the signed URL or null if no image exists.
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

    const { id } = await params;
    const result = await certificationSlidesService.getSlideImageUrl(
      { userId },
      id
    );

    // Return result (which may have url: null if no image exists)
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error(e);

    if (e.message === "Slide not found") {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }

    // For other errors (like "Slide is not an image slide"), return null URL
    // instead of 500 error to gracefully handle non-image slides
    if (e.message === "Slide is not an image slide") {
      return NextResponse.json({ url: null }, { status: 200 });
    }

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

