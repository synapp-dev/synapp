import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { resolveStaging } from "@/entities/match-queue/lib/staging";
import { db } from "@/server/db/drizzle";
import { matchPlayers } from "@/server/db/schema";

/**
 * POST /api/sim/discord  { matchId, steamids: string[], joined?: boolean }
 * Marks the given players as having joined (or left) their Discord team channel, then
 * re-checks staging completion. Drives the simulated §6 Join-Discord phase (dev only).
 */
const bodySchema = z.object({
  matchId: z.string().uuid(),
  steamids: z.array(z.string()).min(1),
  joined: z.boolean().default(true),
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

  await db
    .update(matchPlayers)
    .set({ discordJoined: parsed.data.joined })
    .where(
      and(
        eq(matchPlayers.matchId, parsed.data.matchId),
        inArray(matchPlayers.steamid64, parsed.data.steamids),
      ),
    );

  const result = await resolveStaging(parsed.data.matchId);
  return NextResponse.json({ ok: true, ...result });
}
