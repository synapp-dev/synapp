/**
 * Feature Permissions API route handler.
 *
 * Exposes HTTP endpoints for managing feature permissions.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/features/[featureId]/permissions - Get permissions for a feature
 * - POST /api/features/[featureId]/permissions - Set a permission for a feature
 * - DELETE /api/features/[featureId]/permissions - Remove a permission
 *
 * Responses:
 * - 200 OK: Returns permission data or array of permissions.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { featuresService } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/features/[featureId]/permissions
 *
 * Returns permissions for a feature, optionally filtered by level and targetId.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing featureId.
 * @returns A JSON `NextResponse` with permissions or an error payload.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { featureId } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") as
      | "global"
      | "role"
      | "school"
      | "school_role"
      | "user"
      | null;
    const targetId = searchParams.get("targetId") || undefined;
    const schoolId = searchParams.get("schoolId") || undefined;

    const permissions = await featuresService.getFeaturePermissions(
      { userId },
      featureId,
      level || undefined,
      targetId,
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

/**
 * Handle POST /api/features/[featureId]/permissions
 *
 * Sets a permission for a feature at a specific level.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing featureId.
 * @returns A JSON `NextResponse` with the created/updated permission or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { featureId } = await params;
    const body = await request.json();
    const { level, targetId, schoolId, enabled, visible } = body;

    if (!level || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "level and enabled are required" },
        { status: 400 }
      );
    }

    const permission = await featuresService.setFeaturePermission(
      { userId },
      {
        featureId,
        level,
        targetId,
        schoolId,
        enabled,
        ...(visible !== undefined && { visible: visible === null ? null : !!visible }),
      }
    );

    return NextResponse.json(permission, { status: 200 });
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
 * Handle DELETE /api/features/[featureId]/permissions
 *
 * Removes a permission for a feature.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing featureId.
 * @returns A JSON `NextResponse` with success status or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { featureId } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level") as
      | "global"
      | "role"
      | "school"
      | "school_role"
      | "user"
      | null;
    const targetId = searchParams.get("targetId") || undefined;
    const schoolId = searchParams.get("schoolId") || undefined;

    if (!level) {
      return NextResponse.json(
        { error: "level is required" },
        { status: 400 }
      );
    }

    await featuresService.removeFeaturePermission(
      { userId },
      featureId,
      level,
      targetId,
      schoolId
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
