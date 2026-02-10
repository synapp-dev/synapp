/**
 * Single Feedback Ticket API route handler.
 *
 * Endpoints:
 * - GET   /api/feedback-tickets/[id]  - Get ticket detail (admin)
 * - PATCH /api/feedback-tickets/[id]  - Update ticket status (admin, close restricted to INTRADARK_DEV)
 */
import { NextResponse } from "next/server";
import { feedbackTicketsService } from "@/server/feedback-tickets/feedback-tickets.service";
import { getUserIdFromRequest } from "@/utils/getUserIdFromRequest";
import { createServerClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

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
    const ticket = await feedbackTicketsService.getTicketById({ userId }, id);

    // Generate signed URL for screenshot
    if (ticket.screenshotUrl) {
      const supabase = await createServerClient();
      const { data, error } = await supabase.storage
        .from("content")
        .createSignedUrl(ticket.screenshotUrl, 3600);
      if (!error) {
        ticket.screenshotUrl = data.signedUrl;
      }
    }

    return NextResponse.json(ticket, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets/[id]] GET Error:", e);
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

export async function PATCH(
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
    const updated = await feedbackTicketsService.updateTicketStatus(
      { userId },
      id,
      body
    );

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    console.error("[feedback-tickets/[id]] PATCH Error:", e);
    if (e.message === "Not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (e.message?.includes("Forbidden")) {
      return NextResponse.json({ error: e.message }, { status: 403 });
    }
    const status = e.message?.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { error: e.message ?? "Internal error" },
      { status }
    );
  }
}
