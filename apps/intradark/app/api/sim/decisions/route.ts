import { NextResponse } from "next/server";
import { z } from "zod";

import { setBotDecisions } from "@/entities/match-queue/lib/sim";

/**
 * POST /api/sim/decisions  { matchId, accept: string[], decline: string[] }
 * Applies bot ready-check decisions for a forming match and re-drives §4 (dev only).
 */
const bodySchema = z.object({
  matchId: z.string().uuid(),
  accept: z.array(z.string()).default([]),
  decline: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const result = await setBotDecisions(
    parsed.data.matchId,
    parsed.data.accept,
    parsed.data.decline,
  );
  return NextResponse.json({ ok: true, ...result });
}
