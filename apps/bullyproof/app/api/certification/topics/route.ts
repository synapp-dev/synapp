/**
 * Certification Topics API route handler.
 *
 * Exposes HTTP endpoints for certification topic management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - POST /api/certification/topics - Create a new certification topic (platform admin only)
 *
 * Responses:
 * - 201 Created: Returns the created certification topic.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { certificationTopicsService } from "@/server/certification-topics/certification-topics.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/certification/topics
 *
 * Creates a new certification topic.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created topic or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newTopic = await certificationTopicsService.createTopic({ userId }, body);
    return NextResponse.json(newTopic, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
