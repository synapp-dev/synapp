/**
 * GET /api/feedback-tickets/mine
 *
 * Returns all feedback tickets submitted by the authenticated user,
 * ordered by creation date (most recent first).
 *
 * Authentication:
 * - Requires a valid Bearer token in the Authorization header.
 *
 * Responses:
 * - 200 OK: Returns an array of feedback tickets.
 * - 401 Unauthorized: When user identification fails.
 * - 500 Internal Server Error: On unexpected failures.
 */
import { NextResponse } from "next/server";
import { feedbackTicketsRepo } from "@/server/feedback-tickets/feedback-tickets.repo";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await feedbackTicketsRepo.getByUserId(userId);

    // Generate signed URLs for screenshots
    const supabase = await createServerClient();
    const ticketsWithSignedUrls = await Promise.all(
      tickets.map(async (ticket) => {
        if (!ticket.screenshotUrl) return ticket;

        const { data, error } = await supabase.storage
          .from("content")
          .createSignedUrl(ticket.screenshotUrl, 3600); // 1 hour expiry

        return {
          ...ticket,
          screenshotUrl: error ? null : data.signedUrl,
        };
      })
    );

    return NextResponse.json(ticketsWithSignedUrls, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets/mine] Error:", e);
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
