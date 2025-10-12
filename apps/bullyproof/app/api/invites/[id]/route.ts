/**
 * Invite by ID API route handler.
 *
 * Exposes HTTP endpoints for managing specific invites by ID.
 *
 * Authentication:
 * - Requires a valid user derived from the request (401 if missing).
 * - Platform admins can manage all invites, school admins can manage their school's invites.
 *
 * Endpoints:
 * - GET /api/invites/[id] - Get invite by ID
 * - PUT /api/invites/[id] - Update invite by ID
 * - DELETE /api/invites/[id] - Delete invite by ID
 *
 * Responses:
 * - 200 OK: Returns invite data or updated invite.
 * - 401 Unauthorized: `{ error: string }` when user identification fails.
 * - 403 Forbidden: `{ error: string }` when user lacks required permissions.
 * - 404 Not Found: `{ error: string }` when invite is not found.
 * - 500 Internal Server Error: `{ error: string }` on unexpected failures.
 */
import { NextResponse } from "next/server";
import { invitesService } from "@/server/invites/invites.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

/**
 * Handle GET /api/invites/[id]
 *
 * Returns a specific invite's information by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the invite ID.
 * @returns A JSON `NextResponse` with the invite data or an error payload.
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
    const inviteData = await invitesService.getInviteById({ userId }, { id });

    if (!inviteData) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json(inviteData, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT /api/invites/[id]
 *
 * Updates a specific invite by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the invite ID.
 * @returns A JSON `NextResponse` with the updated invite or an error payload.
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
    const updatedInvite = await invitesService.updateInvite({ userId }, id, body);
    return NextResponse.json(updatedInvite, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE /api/invites/[id]
 *
 * Deletes a specific invite by ID.
 *
 * @param request The incoming HTTP request.
 * @param params The route parameters containing the invite ID.
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
    await invitesService.deleteInvite({ userId }, id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
