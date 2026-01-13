/**
 * Bulk Classes Deletion API route handler.
 *
 * Exposes HTTP endpoint for deleting multiple classes in bulk.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin/teacher role for the school.
 *
 * Endpoints:
 * - DELETE /api/classes/delete - Delete multiple classes
 *
 * Responses:
 * - 200 OK: Returns deletion results.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { classesService } from "@/server/classes/classes.service";
import { z } from "zod";

// Request body schema for bulk deletion
const bulkDeleteClassesSchema = z.object({
  classIds: z.array(z.string().uuid()).min(1),
});

/**
 * Handle DELETE /api/classes/delete
 *
 * Deletes multiple classes in bulk using Drizzle batch operations.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the deletion results or an error payload.
 */
export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { classIds } = bulkDeleteClassesSchema.parse(body);

    const result = await classesService.deleteClassesBatch(
      { userId },
      classIds
    );

    return NextResponse.json(
      {
        success: true,
        deletedCount: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} class(es)`,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[BULK CLASSES DELETE] Error:", e);
    
    if (e.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: e.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
