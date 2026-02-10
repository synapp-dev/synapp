/**
 * Unread Note Count API route handler.
 *
 * Endpoints:
 * - GET /api/feedback-tickets/unread-count - Get count of tickets with unread admin notes for the authenticated user
 */
import { NextResponse } from "next/server";
import { feedbackTicketsService } from "@/server/feedback-tickets/feedback-tickets.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await feedbackTicketsService.getUnreadNoteCount({ userId });

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets/unread-count] GET Error:", e);
    const status = e.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
