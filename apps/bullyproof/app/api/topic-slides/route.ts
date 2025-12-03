/**
 * Topic Slides API route handler.
 *
 * Exposes HTTP endpoints for managing topic slides.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage slides.
 *
 * Endpoints:
 * - POST /api/topic-slides - Create a new slide
 *
 * Responses:
 * - 201 Created: Returns created slide data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { topicsService } from "@/server/topics/topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/topic-slides
 *
 * Creates a new slide.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created slide or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newSlide = await topicsService.createSlide({ userId }, body);

    return NextResponse.json(newSlide, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
