/**
 * Licences API route handler.
 *
 * Exposes HTTP endpoints for school licence management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin role for management operations.
 *
 * Endpoints:
 * - GET /api/licences - List licences (filtered by school for non-platform admins)
 * - POST /api/licences - Create a new licence
 *
 * Responses:
 * - 200 OK: Returns licence data or array of licences.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { licencesService } from "@/server/licences/licences.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/licences
 *
 * Returns a list of licences visible to the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of licences or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const licences = await licencesService.listLicences({ userId }, query);
    return NextResponse.json(licences, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/licences
 *
 * Creates a new licence.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created licence or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newLicence = await licencesService.createLicence({ userId }, body);
    return NextResponse.json(newLicence, { status: 201 });
  } catch (e: any) {
    console.error(e);
    const errorMessage = e.message ?? "Internal error";
    const status = e.message?.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { error: { message: errorMessage, status } },
      { status }
    );
  }
}
