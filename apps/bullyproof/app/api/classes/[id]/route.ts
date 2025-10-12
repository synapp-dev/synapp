/**
 * Class by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific classes by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can access classes in their schools, platform admins can access any class.
 *
 * Endpoints:
 * - GET /api/classes/[id] - Get class by ID
 * - PUT /api/classes/[id] - Update class by ID
 * - DELETE /api/classes/[id] - Delete class by ID
 *
 * Responses:
 * - 200 OK: Returns class data or updated class.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when class is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { classesService } from "@/server/classes/classes.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/classes/[id]
 *
 * Returns a specific class's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the class ID.
 * @returns A JSON `NextResponse` with the class data or an error payload.
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
    const classData = await classesService.getClassById({ userId }, { id });

    if (!classData) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    return NextResponse.json(classData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/classes/[id]
 *
 * Updates a specific class by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the class ID.
 * @returns A JSON `NextResponse` with the updated class or an error payload.
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

    const { id } = await params;
    const body = await request.json();
    const updatedClass = await classesService.updateClass({ userId }, id, body);
    return NextResponse.json(updatedClass, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/classes/[id]
 *
 * Deletes a specific class by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the class ID.
 * @returns A JSON `NextResponse` with success confirmation or an error payload.
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

    const { id } = await params;
    await classesService.deleteClass({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
