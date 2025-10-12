/**
 * Classes API route handler.
 *
 * Exposes HTTP endpoints for class management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires school admin/teacher role for management operations.
 *
 * Endpoints:
 * - GET /api/classes - List classes (filtered by school for non-platform admins)
 * - POST /api/classes - Create a new class
 *
 * Responses:
 * - 200 OK: Returns class data or array of classes.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { classesService } from "@/server/classes/classes.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/classes
 *
 * Returns a list of classes visible to the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of classes or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const classes = await classesService.listClasses({ userId }, query);
    return NextResponse.json(classes, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/classes
 *
 * Creates a new class.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created class or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newClass = await classesService.createClass({ userId }, body);
    return NextResponse.json(newClass, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
