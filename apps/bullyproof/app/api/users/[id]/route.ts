/**
 * User by ID API route handler.
 *
 * Exposes HTTP endpoints for getting and updating specific users by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can access their own profile, admins can access any profile.
 * - Only platform admins can update other users' details.
 *
 * Endpoints:
 * - GET /api/users/[id] - Get user by ID
 * - PATCH /api/users/[id] - Update user details (platform admin only)
 *
 * Responses:
 * - 200 OK: Returns user profile data (GET) or updated user (PATCH).
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when user is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { meService } from "@/server/me/me.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { getUserScopedRoles } from "@/server/auth/rbac";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Request body schema for PATCH
const updateUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

/**
 * Handle GET /api/users/[id]
 *
 * Returns a specific user's profile information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the user profile or an error payload.
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
    const user = await meService.getUserById({ userId }, { id });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

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
 * Handle PATCH /api/users/[id]
 *
 * Updates a user's profile details.
 * Only platform admins can update other users' details.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the updated user or an error payload.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permissions: must be platform admin
    const roles = await getUserScopedRoles(userId);
    const isPlatformAdmin = roles.platform.includes("PLATFORM_ADMIN");

    if (!isPlatformAdmin) {
      console.error("[USER UPDATE] Unauthorized - insufficient permissions:", {
        userId,
        platformRoles: roles.platform,
      });
      return NextResponse.json(
        { error: "Unauthorized - Platform admin role required" },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    const body = await request.json();
    console.log("[USER UPDATE] Request received:", {
      userId,
      targetUserId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(userProfile)
      .where(eq(userProfile.id, targetUserId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Build update object with only provided fields
    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
    } = {};

    if (data.firstName !== undefined) {
      updateData.firstName = data.firstName || null;
    }
    if (data.lastName !== undefined) {
      updateData.lastName = data.lastName || null;
    }
    if (data.email !== undefined) {
      updateData.email = data.email;
    }

    // Update user profile using Drizzle (bypasses RLS)
    await db
      .update(userProfile)
      .set(updateData)
      .where(eq(userProfile.id, targetUserId));

    console.log("[USER UPDATE] User updated successfully:", {
      targetUserId,
      updatedFields: Object.keys(updateData),
    });

    // Fetch updated user
    const updatedUser = await meService.getUserById({ userId }, { id: targetUserId });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (e: any) {
    console.error("[USER UPDATE] Error:", {
      error: e,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
    });

    // Handle validation errors
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    const status =
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Platform admin role required")
        ? 403
        : e.message?.includes("not found")
          ? 404
          : 500;

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
