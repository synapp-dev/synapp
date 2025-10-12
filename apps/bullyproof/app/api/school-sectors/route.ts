/**
 * School Sectors API route handler.
 *
 * Exposes HTTP endpoints for school sector management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - All authenticated users can read school sectors.
 *
 * Endpoints:
 * - GET /api/school-sectors - List all school sectors
 *
 * Responses:
 * - 200 OK: Returns school sector data or array of sectors.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { schoolSectorsService } from "@/server/school-sectors/school-sectors.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/school-sectors
 *
 * Returns a list of school sectors.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of sectors or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const sectors = await schoolSectorsService.getSchoolSectors({ userId }, query);
    return NextResponse.json(sectors, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
