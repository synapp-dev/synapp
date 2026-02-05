/**
 * School Invite API route handler.
 *
 * Exposes HTTP endpoint for logging school invitation requests.
 *
 * Authentication:
 * - No authentication required (logging endpoint).
 *
 * Endpoints:
 * - POST /api/schools/invite - Log school invitation request
 *
 * Request body:
 * - { name?: string, ... } - School data (name is capitalized automatically)
 *
 * Responses:
 * - 200 OK: Returns confirmation with received data.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 *
 * Note: This is currently a logging endpoint that returns the received data.
 * Actual invitation functionality may be implemented separately.
 */
import { NextRequest, NextResponse } from "next/server";
import { capitalizeSchoolName } from "@/utils/school-name";

/**
 * Handle POST /api/schools/invite
 *
 * Logs incoming school invitation request and returns the received data.
 * Automatically capitalizes the school name if provided.
 *
 * @param request The incoming HTTP request containing school data.
 * @returns A JSON `NextResponse` with confirmation and received data or an error payload.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Capitalize school name as a safety measure
    if (body.name && typeof body.name === "string") {
      body.name = capitalizeSchoolName(body.name.trim());
    }
    
     
    console.log("[schools/invite] POST body:", body);

    return NextResponse.json({ ok: true, received: body });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
