/**
 * User Features API route handler.
 *
 * Exposes HTTP endpoint for getting all feature permissions for a user.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can check their own permissions, admins can check any user's permissions.
 *
 * Endpoints:
 * - GET /api/users/[id]/features - Get all feature permissions for a user
 *
 * Query parameters:
 * - schoolId (optional) - Filter permissions for a specific school
 *
 * Responses:
 * - 200 OK: Returns array of feature permissions.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { featuresService } from "@/server/features/features.service";
import { checkFeatureAccess } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/users/[id]/features
 *
 * Returns all feature permissions for a user.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing id (userId).
 * @returns A JSON `NextResponse` with feature permissions or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUserId = await getUserIdFromRequest(request);

    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId") || undefined;

    if (userId !== currentUserId) {
      const hasAdminUsers = await checkFeatureAccess(currentUserId, "admin_users");
      if (!hasAdminUsers) {
        return NextResponse.json(
          { error: "Unauthorized to view other user's permissions" },
          { status: 403 }
        );
      }
    }

    const permissions = await featuresService.getUserFeaturePermissions(
      userId,
      schoolId
    );

    return NextResponse.json(permissions, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
