/**
 * School Sector by ID API route handler.
 *
 * Exposes HTTP endpoints for specific school sector management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read school sectors.
 *
 * Endpoints:
 * - GET /api/school-sectors/[id] - Get school sector by ID
 *
 * Responses:
 * - 200 OK: Returns school sector data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 404 Not Found: `{ error: string }` when sector is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolSectorsService } from "@/server/school-sectors/school-sectors.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/school-sectors/[id]
 *
 * Returns a specific school sector's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the sector ID.
 * @returns A JSON `NextResponse` with the sector data or an error payload.
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
    const sectorData = await schoolSectorsService.getSchoolSectorById({ userId }, { id });

    if (!sectorData) {
      return NextResponse.json({ error: "School sector not found" }, { status: 404 });
    }

    return NextResponse.json(sectorData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
