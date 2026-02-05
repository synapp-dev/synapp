/**
 * User School Positions API route handler.
 *
 * Exposes HTTP endpoints for managing user school positions.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for management operations.
 *
 * Endpoints:
 * - GET /api/users/[id]/positions - Get user's school positions
 * - POST /api/users/[id]/positions - Create a new position for user at a school
 * - PUT /api/users/[id]/positions - Update a position for user at a school
 * - DELETE /api/users/[id]/positions - Delete a position for user at a school
 *
 * Responses:
 * - 200 OK: Returns position data or array of positions.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { db } from "@/server/db/drizzle";
import { userSchoolPositions, schools } from "@/server/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { z } from "zod";
import { handleDatabaseError } from "@/utils/db-error-handler";

// Request body schema for creating/updating positions
const createPositionSchema = z.object({
  schoolId: z.string().uuid(),
  position: z.string().min(1, "Position cannot be empty"),
});

const updatePositionSchema = z.object({
  id: z.string().uuid(),
  position: z.string().min(1, "Position cannot be empty"),
});

const deletePositionSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Handle GET /api/users/[id]/positions
 *
 * Returns all school positions for a specific user.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the user's positions or an error payload.
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

    const hasAdminUsers = await checkFeatureAccess(userId, "admin_users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = id;

    // Get all positions for this user with school information
    const positions = await db
      .select({
        id: userSchoolPositions.id,
        userId: userSchoolPositions.userId,
        schoolId: userSchoolPositions.schoolId,
        position: userSchoolPositions.position,
        createdAt: userSchoolPositions.createdAt,
        school: {
          id: schools.id,
          name: schools.name,
          code: schools.code,
        },
      })
      .from(userSchoolPositions)
      .innerJoin(schools, eq(userSchoolPositions.schoolId, schools.id))
      .where(eq(userSchoolPositions.userId, targetUserId));

    return NextResponse.json(positions, { status: 200 });
  } catch (e: any) {
    console.error("[USER POSITIONS GET] Error:", e);
    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}

/**
 * Handle POST /api/users/[id]/positions
 *
 * Creates a new position for a user at a school.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the created position or an error payload.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdminUsers = await checkFeatureAccess(userId, "admin_users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = id;
    const body = await request.json();
    const data = createPositionSchema.parse(body);

    // Check if position already exists (to avoid duplicates)
    const existing = await db
      .select()
      .from(userSchoolPositions)
      .where(
        and(
          eq(userSchoolPositions.userId, targetUserId),
          eq(userSchoolPositions.schoolId, data.schoolId),
          eq(userSchoolPositions.position, data.position.trim())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Position already exists for this user at this school" },
        { status: 400 }
      );
    }

    // Create the position (database trigger will enforce max 2 positions)
    const [newPosition] = await db
      .insert(userSchoolPositions)
      .values({
        userId: targetUserId,
        schoolId: data.schoolId,
        position: data.position.trim(),
      })
      .returning();

    // Get school information
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, data.schoolId))
      .limit(1);

    return NextResponse.json(
      {
        ...newPosition,
        school: school
          ? {
              id: school.id,
              name: school.name,
              code: school.code,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("[USER POSITIONS POST] Error:", e);

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    // Check for max positions constraint violation
    if (
      e.message?.includes("Maximum of 2 positions") ||
      e.code === "P0001"
    ) {
      return NextResponse.json(
        { error: "Maximum of 2 positions allowed per user per school" },
        { status: 400 }
      );
    }

    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}

/**
 * Handle PUT /api/users/[id]/positions
 *
 * Updates an existing position for a user.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing the user ID.
 * @returns A JSON `NextResponse` with the updated position or an error payload.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdminUsers = await checkFeatureAccess(userId, "admin_users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = id;
    const body = await request.json();
    const data = updatePositionSchema.parse(body);

    // Verify the position belongs to this user
    const [existing] = await db
      .select()
      .from(userSchoolPositions)
      .where(
        and(
          eq(userSchoolPositions.id, data.id),
          eq(userSchoolPositions.userId, targetUserId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    // Check if the new position value already exists (to avoid duplicates)
    // Exclude the current position being updated
    const duplicate = await db
      .select()
      .from(userSchoolPositions)
      .where(
        and(
          eq(userSchoolPositions.userId, targetUserId),
          eq(userSchoolPositions.schoolId, existing.schoolId),
          eq(userSchoolPositions.position, data.position.trim()),
          ne(userSchoolPositions.id, data.id)
        )
      )
      .limit(1);

    if (duplicate.length > 0) {
      return NextResponse.json(
        { error: "Position already exists for this user at this school" },
        { status: 400 }
      );
    }

    // Update the position
    const [updatedPosition] = await db
      .update(userSchoolPositions)
      .set({
        position: data.position.trim(),
      })
      .where(eq(userSchoolPositions.id, data.id))
      .returning();

    // Get school information
    const [school] = await db
      .select()
      .from(schools)
      .where(eq(schools.id, updatedPosition.schoolId))
      .limit(1);

    return NextResponse.json(
      {
        ...updatedPosition,
        school: school
          ? {
              id: school.id,
              name: school.name,
              code: school.code,
            }
          : null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[USER POSITIONS PUT] Error:", e);

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}

/**
 * Handle DELETE /api/users/[id]/positions
 *
 * Deletes a position for a user.
 *
 * @param request The incoming HTTP request.
 * @param params Route parameters containing the user ID.
 * @returns A JSON `NextResponse` with success status or an error payload.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasAdminUsers = await checkFeatureAccess(userId, "admin_users");
    if (!hasAdminUsers) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const targetUserId = id;
    const body = await request.json();
    const data = deletePositionSchema.parse(body);

    // Verify the position belongs to this user
    const [existing] = await db
      .select()
      .from(userSchoolPositions)
      .where(
        and(
          eq(userSchoolPositions.id, data.id),
          eq(userSchoolPositions.userId, targetUserId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      );
    }

    // Delete the position
    await db
      .delete(userSchoolPositions)
      .where(eq(userSchoolPositions.id, data.id));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error("[USER POSITIONS DELETE] Error:", e);

    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    const dbError = handleDatabaseError(e, e.message ?? "Internal error");
    return NextResponse.json(
      { error: dbError.error },
      { status: dbError.status }
    );
  }
}
