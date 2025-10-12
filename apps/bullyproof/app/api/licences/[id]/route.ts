/**
 * Licence by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific licences by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage all licences, school admins can manage their school's licences.
 *
 * Endpoints:
 * - GET /api/licences/[id] - Get licence by ID
 * - PUT /api/licences/[id] - Update licence by ID
 * - DELETE /api/licences/[id] - Delete licence by ID
 *
 * Responses:
 * - 200 OK: Returns licence data or updated licence.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when licence is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { licencesService } from "@/server/licences/licences.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/licences/[id]
 *
 * Returns a specific licence's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the licence ID.
 * @returns A JSON `NextResponse` with the licence data or an error payload.
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
    const licenceData = await licencesService.getLicenceById({ userId }, { id });

    if (!licenceData) {
      return NextResponse.json({ error: "Licence not found" }, { status: 404 });
    }

    return NextResponse.json(licenceData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/licences/[id]
 *
 * Updates a specific licence by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the licence ID.
 * @returns A JSON `NextResponse` with the updated licence or an error payload.
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
    const updatedLicence = await licencesService.updateLicence({ userId }, id, body);
    return NextResponse.json(updatedLicence, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/licences/[id]
 *
 * Deletes a specific licence by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the licence ID.
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
    await licencesService.deleteLicence({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
