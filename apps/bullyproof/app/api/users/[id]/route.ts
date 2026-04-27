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
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import { db } from "@/server/db/drizzle";
import { userProfile } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { handleDatabaseError } from "@/utils/db-error-handler";
import { assertActorCanManageIntradarkDevTarget } from "@/server/auth/intradark-dev-account-guard";

type UpdateLogChange = {
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

type UpdateLog = {
  type?: "creation" | "update";
  updatedAt: string;
  updatedBy: string;
  changes?: UpdateLogChange[];
};

type UserMetadata = {
  updateLogs?: UpdateLog[];
  roleLogs?: unknown[];
  [key: string]: unknown;
};

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
    const { searchParams } = new URL(request.url);
    const includeFeatures = searchParams.get("includeFeatures") === "true";
    const user = includeFeatures
      ? await meService.getUserByIdForViewMode({ userId }, { id }, true)
      : await meService.getUserById({ userId }, { id });

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

    const hasAdminUsers = await checkFeatureAccess(userId, "/admin/users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
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

    try {
      await assertActorCanManageIntradarkDevTarget(userId, targetUserId);
    } catch (e: any) {
      return NextResponse.json(
        { error: e?.message ?? "Forbidden" },
        { status: 403 }
      );
    }

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

    // Build update object with only provided fields and track changes
    const updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      metadata?: any;
    } = {};

    const changes: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    if (data.firstName !== undefined) {
      const oldValue = existingUser[0].firstName;
      const newValue = data.firstName || null;
      if (oldValue !== newValue) {
        changes.push({
          field: "firstName",
          oldValue,
          newValue,
        });
        updateData.firstName = newValue;
      }
    }
    if (data.lastName !== undefined) {
      const oldValue = existingUser[0].lastName;
      const newValue = data.lastName || null;
      if (oldValue !== newValue) {
        changes.push({
          field: "lastName",
          oldValue,
          newValue,
        });
        updateData.lastName = newValue;
      }
    }
    if (data.email !== undefined) {
      const oldValue = existingUser[0].email;
      const newValue = data.email;
      if (oldValue !== newValue) {
        changes.push({
          field: "email",
          oldValue,
          newValue,
        });
        updateData.email = newValue;
      }
    }

    // Only proceed if there are actual changes
    if (Object.keys(updateData).length === 0 && changes.length === 0) {
      // No changes to make, return existing user
      const existingUserData = await meService.getUserById({ userId }, { id: targetUserId });
      return NextResponse.json(existingUserData, { status: 200 });
    }

    // Update metadata with update log if there are changes
    if (changes.length > 0) {
      const currentMetadata = (existingUser[0].metadata as UserMetadata | null) || ({} as UserMetadata);
      const updateLogs = Array.isArray(currentMetadata.updateLogs) 
        ? currentMetadata.updateLogs 
        : [];
      
      updateLogs.push({
        type: "update",
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        changes,
      });

      updateData.metadata = {
        ...currentMetadata,
        updateLogs,
      };
    }

    // If email changed, update it in auth.users via Supabase admin API
    // This ensures the auth identity stays in sync with user_profiles
    if (data.email !== undefined && data.email !== existingUser[0].email) {
      const adminClient = await createServerAdminClient();
      const { error: authUpdateError } =
        await adminClient.auth.admin.updateUserById(targetUserId, {
          email: data.email,
          email_confirm: true, // Skip confirmation email since admin is making the change
        });

      if (authUpdateError) {
        console.error("[USER UPDATE] Failed to update auth email:", {
          targetUserId,
          error: authUpdateError.message,
        });
        return NextResponse.json(
          { error: `Failed to update auth email: ${authUpdateError.message}` },
          { status: 500 }
        );
      }

      console.log("[USER UPDATE] Auth email updated successfully for:", targetUserId);
    }

    // Update user profile using Drizzle (bypasses RLS) and return updated data
    // Use .returning() to avoid an extra query
    const [updatedUserProfile] = await db
      .update(userProfile)
      .set(updateData)
      .where(eq(userProfile.id, targetUserId))
      .returning();

    console.log("[USER UPDATE] User updated successfully:", {
      targetUserId,
      updatedFields: Object.keys(updateData),
    });

    // Fetch full user data with relations using service
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

    // Handle business logic errors (authorization, not found)
    if (
      e.message?.includes("Unauthorized") ||
      e.message?.includes("Platform admin role required")
    ) {
      return NextResponse.json(
        { error: e.message },
        { status: 403 }
      );
    }

    if (e.message?.includes("not found")) {
      return NextResponse.json(
        { error: e.message },
        { status: 404 }
      );
    }

    // Handle database errors
    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}
