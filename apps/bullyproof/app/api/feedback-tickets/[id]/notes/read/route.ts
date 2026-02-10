/**
 * Mark Notes Read API route handler.
 *
 * Endpoints:
 * - POST /api/feedback-tickets/[id]/notes/read - Mark all admin notes on a ticket as read (ticket owner only)
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
    const result = await feedbackTicketsService.markNotesRead({ userId }, id);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets/[id]/notes/read] POST Error:", e);
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
