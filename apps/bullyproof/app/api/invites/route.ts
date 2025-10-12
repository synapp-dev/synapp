/**
 * Invites API route handler.
 *
 * Exposes HTTP endpoints for school invitation management.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Requires platform admin or school admin role for management operations.
 *
 * Endpoints:
 * - GET /api/invites - List invites (filtered by school for non-platform admins)
 * - POST /api/invites - Create a new invite
 *
 * Responses:
 * - 200 OK: Returns invite data or array of invites.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { invitesService } from "@/server/invites/invites.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/invites
 *
 * Returns a list of invites visible to the authenticated user.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the list of invites or an error payload.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    const invites = await invitesService.listInvites({ userId }, query);
    return NextResponse.json(invites, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle POST /api/invites
 *
 * Creates a new invite.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the created invite or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const newInvite = await invitesService.createInvite({ userId }, body);
    return NextResponse.json(newInvite, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
