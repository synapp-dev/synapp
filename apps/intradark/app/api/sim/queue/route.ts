import { NextResponse } from "next/server";
import { z } from "zod";

import { QUEUE_LEAGUES } from "@/entities/match-queue/lib/leagues";
import { queueBots } from "@/entities/match-queue/lib/sim";

/**
 * POST /api/sim/queue  { league, steamids: string[] }
 * Drops the given bots into a league's queue and attempts match formation (dev only).
 * Callers stagger one bot per request to mimic a filling lobby.
 */
const bodySchema = z.object({
  league: z.enum(QUEUE_LEAGUES),
  steamids: z.array(z.string()).min(1),
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

  const result = await queueBots(parsed.data.league, parsed.data.steamids);
  return NextResponse.json({ ok: true, ...result });
}
