/**
 * Accept Invite API route handler.
 *
 * Exposes HTTP endpoints for accepting school invitations.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Users can only accept invites sent to their email.
 *
 * Endpoints:
 * - POST /api/invites/accept - Accept an invite
 *
 * Responses:
 * - 200 OK: Returns accepted invite data.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when invite is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { invitesService } from "@/server/invites/invites.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle POST /api/invites/accept
 *
 * Accepts a school invitation.
 *
 * @param request The incoming HTTP request.
 * @returns A JSON `NextResponse` with the accepted invite or an error payload.
 */
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const acceptedInvite = await invitesService.acceptInvite({ userId }, body);
    return NextResponse.json(acceptedInvite, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
