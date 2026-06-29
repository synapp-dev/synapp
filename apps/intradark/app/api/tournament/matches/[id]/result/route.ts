import { z } from "zod";

import { finalizeMatch } from "@/entities/match-queue/lib/finalize";
import { requireTournamentAdmin } from "@/entities/tournament/lib/guard";

/**
 * Manual result entry (plan §7.3 fallback) — admin reports a score, which flows
 * through the SAME finalizeMatch seam the MatchZy auto-ingest uses. Applies Elo,
 * standings, and the ladder swap.
 */
const resultSchema = z.object({
  winnerTeam: z.union([z.literal(1), z.literal(2), z.null()]),
  scoreTeam1: z.number().int().nonnegative(),
  scoreTeam2: z.number().int().nonnegative(),
  map: z.string().max(64).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  playerStats: z
    .array(
      z.object({
        steamid64: z.string().min(1),
        kills: z.number().int().nonnegative().optional(),
        deaths: z.number().int().nonnegative().optional(),
        assists: z.number().int().nonnegative().optional(),
        headshotKills: z.number().int().nonnegative().optional(),
        damage: z.number().int().nonnegative().optional(),
        mvps: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireTournamentAdmin();
  if (gate instanceof Response) return gate;

  const parsed = resultSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const summary = await finalizeMatch(id, parsed.data);
    return Response.json(summary);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
