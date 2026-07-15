/**
 * School License User Creation API route handler.
 *
 * Exposes HTTP endpoint for creating new school licenses with associated users.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin role for creating school licenses.
 *
 * Endpoints:
 * - POST /api/users/new/school-license - Create a new school license
 *
 * Responses:
 * - 201 Created: Returns the created license data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { checkFeatureAccess } from "@/server/features/features.service";
import { createServerAdminClient } from "@/utils/supabase/admin";
import {
  findAuthUserIdByEmail,
  getOrCreateAuthUserId,
} from "@/server/user/resolve-auth-user-by-email";
import { rolesRepo } from "@/server/roles/roles.repo";
import { licencesRepo } from "@/server/licences/licences.repo";
import { z } from "zod";

// Request body schema
const createSchoolLicenseSchema = z.object({
  schoolId: z.string().uuid(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z
    .enum(["DRAFT", "PENDING", "ACTIVE", "SUSPENDED", "EXPIRED", "CANCELLED"])
    .default("PENDING"),
  durationYears: z.number().int().min(1).max(10).default(3),
  maxUsers: z.number().int().min(1).max(10000).optional(),
  features: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Handle POST /api/users/new/school-license
 *
 * Creates a new school license. If email is provided, creates/finds a user and assigns SCHOOL_LICENCE role.
 * If no email is provided, uses existing user with SCHOOL_LICENCE role for the school.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created license or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin_schools feature (licences/invites are school-related admin)
    const hasAdminSchools = await checkFeatureAccess(userId, "/admin/schools");
    if (!hasAdminSchools) {
      console.error(
        "[SCHOOL LICENSE CREATE] Unauthorized - admin_schools required:",
        { userId }
      );
      return NextResponse.json(
        { error: "Unauthorized - Admin schools permission required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log("[SCHOOL LICENSE CREATE] Request received:", {
      userId,
      body: { ...body, email: body.email ? "***" : undefined },
    });

    // Validate request body
    const data = createSchoolLicenseSchema.parse(body);

    const adminClient = await createServerAdminClient();
    let licenceUserId: string | null = null;

    // If email is provided, create/find user
    if (data.email) {
      console.log(
        "[SCHOOL LICENSE CREATE] Email provided, creating/finding user:",
        data.email
      );

      const userMetadata: Record<string, string> = {};
      if (data.firstName) userMetadata.first_name = data.firstName;
      if (data.lastName) userMetadata.last_name = data.lastName;

      const existingAuthUserId = await findAuthUserIdByEmail(
        adminClient.auth.admin,
        data.email
      );

      console.log("[SCHOOL LICENSE CREATE] Creating new user in auth.users");
      licenceUserId = await getOrCreateAuthUserId(
        adminClient.auth.admin,
        data.email,
        {
          userMetadata:
            Object.keys(userMetadata).length > 0 ? userMetadata : undefined,
        }
      );
      console.log(
        "[SCHOOL LICENSE CREATE] User resolved, userId:",
        licenceUserId
      );

      if (!existingAuthUserId) {
        console.log(
          "[SCHOOL LICENSE CREATE] Waiting for trigger to create user_profile..."
        );
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { error: profileError } = await adminClient
          .from("user_profile")
          .select("id")
          .eq("id", licenceUserId)
          .single();

        if (profileError) {
          console.error(
            "[SCHOOL LICENSE CREATE] Database error - Failed to verify user_profile:",
            {
              error: profileError,
              code: profileError.code,
              message: profileError.message,
              userId: licenceUserId,
            }
          );

          if (profileError.code === "PGRST116") {
            console.log(
              "[SCHOOL LICENSE CREATE] Trigger failed, creating user_profile manually..."
            );
            const { error: insertError } = await adminClient
              .from("user_profile")
              .insert({
                id: licenceUserId,
                email: data.email,
              });

            if (insertError) {
              throw new Error(
                `Failed to create user profile: ${insertError.message}`
              );
            }
          } else {
            throw new Error(
              `Failed to verify user profile: ${profileError.message}`
            );
          }
        }
      }

      // Get SCHOOL_LICENCE role
      const schoolLicenceRole = await rolesRepo.getByKey("SCHOOL_LICENCE");
      if (!schoolLicenceRole[0]) {
        console.error("[SCHOOL LICENSE CREATE] SCHOOL_LICENCE role not found");
        throw new Error("SCHOOL_LICENCE role not found");
      }

      // Check if user already has this role for this school
      const existingRole = await rolesRepo.hasRole(
        licenceUserId,
        schoolLicenceRole[0].id,
        data.schoolId
      );

      // Assign role if not already assigned
      if (existingRole.length === 0) {
        console.log(
          "[SCHOOL LICENSE CREATE] Assigning SCHOOL_LICENCE role to user"
        );
        await rolesRepo.assignRole({
          userId: licenceUserId,
          roleId: schoolLicenceRole[0].id,
          schoolId: data.schoolId,
          roleScope: "school",
        });
        console.log("[SCHOOL LICENSE CREATE] Role assigned successfully");
      } else {
        console.log(
          "[SCHOOL LICENSE CREATE] User already has SCHOOL_LICENCE role for this school"
        );
      }
    } else {
      // No email provided - find existing user with SCHOOL_LICENCE role for this school
      console.log(
        "[SCHOOL LICENSE CREATE] No email provided, finding existing SCHOOL_LICENCE user"
      );

      const schoolLicenceRole = await rolesRepo.getByKey("SCHOOL_LICENCE");
      if (!schoolLicenceRole[0]) {
        console.error("[SCHOOL LICENSE CREATE] SCHOOL_LICENCE role not found");
        throw new Error("SCHOOL_LICENCE role not found");
      }

      const existingUsers = await rolesRepo.getUsersByRole(
        schoolLicenceRole[0].id,
        data.schoolId
      );

      if (existingUsers.length === 0) {
        console.error(
          "[SCHOOL LICENSE CREATE] No existing SCHOOL_LICENCE user found for school:",
          {
            schoolId: data.schoolId,
          }
        );
        throw new Error(
          "No email provided and no existing SCHOOL_LICENCE user found for this school. Please provide an email to create a new user."
        );
      }

      licenceUserId = existingUsers[0].user.id;
      console.log(
        "[SCHOOL LICENSE CREATE] Using existing SCHOOL_LICENCE user:",
        {
          userId: licenceUserId,
          email: existingUsers[0].user.email,
        }
      );
    }

    // Calculate start and end dates
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + data.durationYears);
    endDate.setHours(23, 59, 59, 999);

    const startDateISO = startDate.toISOString();
    const endDateISO = endDate.toISOString();

    // Create the school license
    console.log("[SCHOOL LICENSE CREATE] Creating school license:", {
      schoolId: data.schoolId,
      status: data.status,
      createdBy: userId,
    });

    // Note: licencesRepo.create expects startDate/endDate (mapped internally to startsAt/endsAt in schema)
    const newLicence = await licencesRepo.create({
      schoolId: data.schoolId,
      status: data.status,
      startDate: startDateISO,
      endDate: endDateISO,
      maxUsers: data.maxUsers,
      features: data.features,
      metadata: data.metadata,
      createdByUserId: userId,
    });

    console.log(
      "[SCHOOL LICENSE CREATE] School license created successfully:",
      {
        licenceId: newLicence[0].id,
      }
    );

    // Get license details with relations
    const licenceDetails = await licencesRepo.getWithDetails(newLicence[0].id);

    return NextResponse.json(licenceDetails, { status: 201 });
  } catch (e: any) {
    console.error("[SCHOOL LICENSE CREATE] Error:", {
      error: e,
      message: e?.message,
      name: e?.name,
      stack: e?.stack,
      code: e?.code,
      detail: e?.detail,
      hint: e?.hint,
      constraint: e?.constraint,
      table: e?.table,
      column: e?.column,
    });

    // Handle validation errors
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: e.issues },
        { status: 400 }
      );
    }

    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
