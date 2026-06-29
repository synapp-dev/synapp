import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/drizzle";
import { matchPlayers, matches } from "@/server/db/schema";
import { setAcceptDecision } from "@/entities/match-queue/lib/accept";

export const dynamic = "force-dynamic";

/**
 * POST /api/match/accept-by-bot  { steamid64, decision }
 * Lets the Steam friends bot record a player's accept/decline from a Steam DM reply.
 * Authenticated by the shared bot secret; the steamid64 is bot-vouched (the Steam
 * message sender's real, OpenID-proven identity). Reuses setAcceptDecision so all
 * the locking / cooldown / resolution logic is shared with the on-site path.
 */
const bodySchema = z.object({
  steamid64: z.string().regex(/^\d{17}$/),
  decision: z.enum(["accept", "decline"]),
});

export async function POST(request: Request) {
  const secret = process.env.STEAM_FRIENDS_BOT_HTTP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "bot secret not configured" },
      { status: 500 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  const { steamid64, decision } = parsed.data;

  // The player's active forming match (at most one in pending_accept).
  const [row] = await db
    .select({ matchId: matchPlayers.matchId })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .where(
      and(
        eq(matchPlayers.steamid64, steamid64),
        eq(matches.status, "pending_accept"),
        eq(matchPlayers.acceptStatus, "pending"),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ ok: true, found: false });
  }

  const result = await setAcceptDecision(row.matchId, steamid64, decision);
  return NextResponse.json({ ok: true, found: true, status: result.status });
}
