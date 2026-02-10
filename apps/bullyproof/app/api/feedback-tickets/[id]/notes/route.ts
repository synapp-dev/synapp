/**
 * Admin Notes API route handler.
 *
 * Endpoints:
 * - POST /api/feedback-tickets/[id]/notes - Add an admin note to a ticket
 */
import { NextResponse } from "next/server";
import { feedbackTicketsService } from "@/server/feedback-tickets/feedback-tickets.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export const runtime = "nodejs";

export async function POST(
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
    const note = await feedbackTicketsService.addAdminNote(
      { userId },
      id,
      body
    );

    return NextResponse.json(note, { status: 201 });
  } catch (e: any) {
    console.error("[feedback-tickets/[id]/notes] POST Error:", e);
    if (e.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const status = e.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
