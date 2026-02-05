/**
 * Me API route handler.
 *
 * Exposes HTTP endpoints for user profile management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Endpoints:
 * - GET /api/me - Get current user's profile
 * - PUT /api/me - Update current user's profile
 *
 * Responses:
 * - 200 OK: Returns user profile data or updated profile.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/me
 *
 * Returns the current user's profile information.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the user profile or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if feature permissions should be included
    const { searchParams } = new URL(request.url);
    const includeFeatures = searchParams.get("includeFeatures") === "true";

    const user = await meService.getCurrentUser({ userId }, includeFeatures);
    return NextResponse.json(user, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/me
 *
 * Updates the current user's profile information.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the updated user profile or an error payload.
 */
export async function PUT(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updatedUser = await meService.updateUserProfile({ userId }, body);
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
