/**
 * Bulk feature permissions API.
 *
 * GET /api/features/permissions?level=global
 * GET /api/features/permissions?level=role&targetId=...
 * GET /api/features/permissions?level=school&targetId=...
 * GET /api/features/permissions?level=school_role&targetId=...&schoolId=...
 * GET /api/features/permissions?level=user&targetId=...
 *
 * Returns all permissions at the given level in one response (no per-feature calls).
 */
import { NextResponse } from "next/server";
import { featuresService } from "@/server/features/features.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
        { error: "level is required (global, role, school, school_role, user)" },
        { status: 400 }
      );
    }
    if (level === "school_role" && !schoolId) {
      return NextResponse.json(
        { error: "schoolId is required for school_role level" },
        { status: 400 }
      );
    }
    if (level !== "global" && level !== "school_role" && !targetId) {
      return NextResponse.json(
        { error: "targetId is required for role, school, and user levels" },
        { status: 400 }
      );
    }

    const permissions = await featuresService.getAllPermissionsByLevel(
      { userId },
      level,
      targetId,
      schoolId
    );
    return NextResponse.json(permissions, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    const status =
      (e as { message?: string })?.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: (e as Error)?.message ?? "Internal error" },
      { status }
    );
  }
}
