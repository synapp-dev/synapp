/**
 * Bulk Year Levels Update API route handler.
 *
 * Exposes HTTP endpoint for updating year level assignments for multiple classes in bulk.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin/teacher role for the school.
 *
 * Endpoints:
 * - PUT /api/classes/bulk-year-levels - Update year levels for multiple classes
 *
 * Responses:
 * - 200 OK: Returns the update results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { classesService } from "@/server/classes/classes.service";
import { z } from "zod";
import { handleDatabaseError } from "@/utils/db-error-handler";

// Request body schema for bulk year level update
const bulkYearLevelsSchema = z.object({
  classIds: z.array(z.string().uuid()).min(1),
  yearIds: z.array(z.string().uuid()).optional(),
  action: z.enum(["assign", "replace"]).optional(),
  startYear: z.string().datetime().optional(),
});

/**
 * Handle PUT /api/classes/bulk-year-levels
 *
 * Updates year level assignments for multiple classes in bulk.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the update results or an error payload.
 */
export async function PUT(request: Request) {
  const startTime = Date.now();
  console.log("[BULK YEAR LEVELS UPDATE] ====== START ======");

  try {
    // Step 1: Get user ID
    console.log("[BULK YEAR LEVELS UPDATE] Step 1: Getting user ID from request...");
    let userId: string;
    try {
      userId = await getUserIdFromRequest(request);
      console.log("[BULK YEAR LEVELS UPDATE] Step 1: Success, userId:", userId);
    } catch (error: any) {
      console.error("[BULK YEAR LEVELS UPDATE] Step 1: Failed to get user ID:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userId) {
      console.error("[BULK YEAR LEVELS UPDATE] Step 1: No userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Parse request body
    console.log("[BULK YEAR LEVELS UPDATE] Step 2: Parsing request body...");
    let body: any;
    try {
      body = await request.json();
      console.log("[BULK YEAR LEVELS UPDATE] Step 2: Success, body parsed:", {
        classCount: body.classIds?.length || 0,
        yearCount: body.yearIds?.length || 0,
        action: body.action,
      });
    } catch (error: any) {
      console.error("[BULK YEAR LEVELS UPDATE] Step 2: Failed to parse JSON:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Step 3: Validate request body
    let data: z.infer<typeof bulkYearLevelsSchema>;
    try {
      data = bulkYearLevelsSchema.parse(body);
      console.log("[BULK YEAR LEVELS UPDATE] Step 3: Success, validated:", {
        classCount: data.classIds.length,
        yearCount: data.yearIds?.length || 0,
        action: data.action,
        hasStartYear: !!data.startYear,
      });
    } catch (error: any) {
      console.error("[BULK YEAR LEVELS UPDATE] Step 3: Validation failed:", {
        error: error.message,
        errors: error.errors,
        name: error.name,
      });
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error.errors || error.message,
        },
        { status: 400 }
      );
    }

    // Step 4: Process bulk update
    console.log("[BULK YEAR LEVELS UPDATE] Step 4: Processing bulk update...");
    const result = await classesService.bulkUpdateYearLevels(
      { userId },
      {
        classIds: data.classIds,
        yearIds: data.yearIds || [],
        action: data.action || "assign",
        startYear: data.startYear,
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("[BULK YEAR LEVELS UPDATE] ====== COMPLETE ======", {
      duration: `${duration}ms`,
      total: result.summary.total,
      succeeded: result.summary.succeeded,
      failed: result.summary.failed,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error("[BULK YEAR LEVELS UPDATE] ====== ERROR ======", {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });

    const dbError = handleDatabaseError(error);
    return NextResponse.json(
      { error: dbError.error || "Internal server error" },
      { status: 500 }
    );
  }
}
