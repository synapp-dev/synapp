/**
 * Schools API route handler.
 *
 * Exposes HTTP GET and POST endpoints for schools.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 *
 * Query parameters (GET):
 * - All query string parameters are forwarded as-is to the underlying service
 *   and may be used for filtering, pagination, or sorting depending on the
 *   service implementation.
 *
 * Request body (POST):
 * - { school: CreateSchoolParams, adminEmails: string[] }
 *
 * Responses:
 * - GET 200 OK: Returns an array of schools (shape defined by the service layer).
 * - POST 201 Created: Returns the created school and admin user details.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolService } from "@/server/school/school.service";
import { userService } from "@/server/user/user.service";
import { rolesRepo } from "@/server/roles/roles.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { db } from "@/server/db/drizzle";
import { userRoles } from "@/server/db/schema";

/**
 * Handle GET /api/schools
 *
 * Extracts query parameters, validates the requester is authenticated, then
 * delegates to `schoolService.listSchools` to fetch visible schools for the
 * current user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of schools or an error payload.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await schoolService.listSchools({ userId }, query);
    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/schools
 *
 * Creates a new school and associated admin users with magic link emails.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created school and admin user details.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { school, adminEmails } = body;

    if (!school || !adminEmails || !Array.isArray(adminEmails) || adminEmails.length === 0) {
      return NextResponse.json(
        { error: "School data and at least one admin email are required" },
        { status: 400 }
      );
    }

    if (!school.levelIds || !Array.isArray(school.levelIds) || school.levelIds.length === 0) {
      return NextResponse.json(
        { error: "At least one school level is required" },
        { status: 400 }
      );
    }

    // Get SCHOOL_ADMIN role ID
    const schoolAdminRoles = await rolesRepo.getAll();
    const schoolAdminRole = schoolAdminRoles.find((r) => r.key === "SCHOOL_ADMIN");

    if (!schoolAdminRole) {
      return NextResponse.json(
        { error: "SCHOOL_ADMIN role not found" },
        { status: 500 }
      );
    }

    // Create the school
    const createdSchool = await schoolService.createSchool({ userId }, school);

    // Create admin users and assign roles
    const adminUsers = [];
    const errors = [];

    for (const email of adminEmails) {
      try {
        // Create user with magic link
        const userResult = await userService.createUserWithMagicLink(
          { userId },
          { email }
        );

        // Assign SCHOOL_ADMIN role to the user
        await db.insert(userRoles).values({
          userId: userResult.userId,
          roleId: schoolAdminRole.id,
          schoolId: createdSchool.id,
          roleScope: "school",
        });

        adminUsers.push({
          userId: userResult.userId,
          email: userResult.email,
        });
      } catch (err: any) {
        console.error(`Failed to create admin user ${email}:`, err);
        errors.push({ email, error: err.message });
      }
    }

    if (errors.length > 0 && adminUsers.length === 0) {
      // All admin users failed to create
      return NextResponse.json(
        {
          error: "Failed to create admin users",
          details: errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        school: createdSchool,
        adminUsers,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
