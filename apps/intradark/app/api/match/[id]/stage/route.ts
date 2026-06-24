import { NextResponse } from "next/server";

import { resolveStaging, startStaging } from "@/entities/match-queue/lib/staging";

/**
 * POST /api/match/[id]/stage
 * Idempotently drives §5/§6: accepted → staging (team names + Discord channels), and
 * re-checks staging completion. Called by the match page on load and on a poll.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await startStaging(id);
  const result = await resolveStaging(id);
  return NextResponse.json({ ok: true, ...result });
}
