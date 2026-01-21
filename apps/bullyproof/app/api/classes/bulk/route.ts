/**
 * Bulk Classes Creation API route handler.
 *
 * Exposes HTTP endpoint for creating multiple classes in bulk with teacher assignments.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin/teacher role for the school.
 *
 * Endpoints:
 * - POST /api/classes/bulk - Create multiple classes with teacher assignments
 *
 * Responses:
 * - 201 Created: Returns the creation results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { classesService } from "@/server/classes/classes.service";
import { classesRepo } from "@/server/classes/classes.repo";
import { z } from "zod";
import { handleDatabaseError } from "@/utils/db-error-handler";

// Request body schema for bulk creation
const bulkClassesSchema = z.object({
  schoolId: z.string().uuid(),
  classes: z.array(
    z.object({
      name: z.string().trim().min(1).max(200),
      code: z.string().trim().max(50).optional(),
      studentCap: z.number().int().min(0).max(1000).optional(),
      teacherUserIds: z.array(z.string().uuid()).optional().default([]),
      yearIds: z.array(z.string().uuid()).optional().default([]),
      startYear: z.string().datetime().optional(),
    })
  ),
});

/**
 * Handle POST /api/classes/bulk
 *
 * Creates multiple classes in bulk and assigns teachers.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the creation results or an error payload.
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("[BULK CLASSES CREATE] ====== START ======");

  try {
    // Step 1: Get user ID
    console.log("[BULK CLASSES CREATE] Step 1: Getting user ID from request...");
    let userId: string;
    try {
      userId = await getUserIdFromRequest(request);
      console.log("[BULK CLASSES CREATE] Step 1: Success, userId:", userId);
    } catch (error: any) {
      console.error("[BULK CLASSES CREATE] Step 1: Failed to get user ID:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!userId) {
      console.error("[BULK CLASSES CREATE] Step 1: No userId returned");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Parse request body
    console.log("[BULK CLASSES CREATE] Step 2: Parsing request body...");
    let body: any;
    try {
      body = await request.json();
      console.log("[BULK CLASSES CREATE] Step 2: Success, body parsed:", {
        classCount: body.classes?.length || 0,
        schoolId: body.schoolId,
        hasClasses: !!body.classes,
      });
    } catch (error: any) {
      console.error("[BULK CLASSES CREATE] Step 2: Failed to parse JSON:", {
        error: error.message,
        stack: error.stack,
      });
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Step 3: Validate request body
    console.log("[BULK CLASSES CREATE] Step 3: Validating request body...");
    let data: z.infer<typeof bulkClassesSchema>;
    try {
      data = bulkClassesSchema.parse(body);
      console.log("[BULK CLASSES CREATE] Step 3: Success, validated:", {
        classCount: data.classes.length,
        schoolId: data.schoolId,
      });
    } catch (error: any) {
      console.error("[BULK CLASSES CREATE] Step 3: Validation failed:", {
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

    // Step 4: Process classes
    console.log("[BULK CLASSES CREATE] Step 4: Processing classes...");
    const results: Array<{
      name: string;
      status: "success" | "error";
      classId?: string;
      error?: string;
      message?: string;
    }> = [];

    let successCount = 0;
    let errorCount = 0;

    for (const classData of data.classes) {
      try {
        console.log(
          `[BULK CLASSES CREATE] Creating class: ${classData.name}`
        );

        // Create the class
        const newClass = await classesService.createClass(
          { userId },
          {
            schoolId: data.schoolId,
            name: classData.name,
            code: classData.code,
            studentCap: classData.studentCap,
            active: true,
            yearIds: classData.yearIds || [],
            startYear: classData.startYear,
          }
        );

        if (!newClass) {
          throw new Error("Failed to create class");
        }

        // Assign teachers if provided
        if (
          classData.teacherUserIds &&
          classData.teacherUserIds.length > 0
        ) {
          console.log(
            `[BULK CLASSES CREATE] Assigning ${classData.teacherUserIds.length} teachers to class ${newClass.id}`
          );
          await classesRepo.assignTeachers(
            newClass.id,
            classData.teacherUserIds
          );
        }

        results.push({
          name: classData.name,
          status: "success",
          classId: newClass.id,
          message: "Class created successfully",
        });
        successCount++;
      } catch (error: any) {
        console.error(
          `[BULK CLASSES CREATE] Error creating class ${classData.name}:`,
          error
        );

        const dbError = handleDatabaseError(error);
        results.push({
          name: classData.name,
          status: "error",
          error: dbError.error || error.message || "Unknown error",
        });
        errorCount++;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log("[BULK CLASSES CREATE] ====== COMPLETE ======", {
      duration: `${duration}ms`,
      total: data.classes.length,
      success: successCount,
      errors: errorCount,
    });

    return NextResponse.json(
      {
        mode: "production",
        school: { id: data.schoolId },
        total: data.classes.length,
        success: successCount,
        errors: errorCount,
        results,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.error("[BULK CLASSES CREATE] ====== ERROR ======", {
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
