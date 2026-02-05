/**
 * Feature Check API route handler.
 *
 * Exposes HTTP endpoint for checking feature access.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can check their own feature access.
 *
 * Endpoints:
 * - POST /api/features/check - Check if user has access to a feature
 *
 * Request body:
 * - { featureKey: string, userId?: string, schoolId?: string }
 *
 * Responses:
 * - 200 OK: Returns { hasAccess: boolean }.
 * - 400 Bad Request: `{ error: string }` when required fields are missing.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { featuresService } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/features/check
 *
 * Checks if a user has access to a feature.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with access status or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Safely parse request body with error handling
    let body: any = {};
    try {
      // Check if request was aborted
      if (request.signal?.aborted) {
        return NextResponse.json(
          { error: "Request was aborted" },
          { status: 400 }
        );
      }

      // Try to parse JSON body
      body = await request.json();
    } catch (parseError: any) {
      // Handle empty body or invalid JSON
      if (
        parseError.message?.includes("Unexpected end of JSON input") ||
        parseError.message?.includes("JSON")
      ) {
        return NextResponse.json(
          { error: "Request body is required and must be valid JSON" },
          { status: 400 }
        );
      }
      // Re-throw other errors
      throw parseError;
    }

    const { featureKey, userId: targetUserId, schoolId } = body;

    if (!featureKey) {
      return NextResponse.json(
        { error: "featureKey is required" },
        { status: 400 }
      );
    }

    // Use targetUserId if provided (for admin checking other users), otherwise use current user
    const checkUserId = targetUserId || userId;

    const hasAccess = await featuresService.checkFeatureAccess(
      checkUserId,
      featureKey,
      schoolId
    );

    return NextResponse.json({ hasAccess }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
