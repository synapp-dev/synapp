/**
 * Features API route handler.
 *
 * Exposes HTTP endpoints for feature management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/features - List all features (platform admin only)
 * - POST /api/features - Create a new feature (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns feature data or array of features.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { featuresService } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/features
 *
 * Returns a list of all features.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of features or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const features = await featuresService.listFeatures({ userId });
    return NextResponse.json(features, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}

/**
 * Handle POST /api/features
 *
 * Creates a new feature.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created feature or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const feature = await featuresService.createFeature({ userId }, body);
    return NextResponse.json(feature, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
