/**
 * Queue (PUG) driver. Matches are born by the existing matchmaker; this driver
 * models the PUG leagues (champions/stellaris/genesis/open) as competitions and
 * accrues per-season visible "steal points" standings (separate from hidden Elo).
 * See docs/tournaments/plan.md §3.1 and docs/pug-match-loop-build-decisions.md §2.1.
 */
import "server-only";

import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { stealPointsByTeam } from "@/entities/match-queue/lib/steal-points";
import { db } from "@/server/db/drizzle";
import { competitionStandings, matchPlayers } from "@/server/db/schema";

import type { FormatDriver, MatchCompletedCtx, StageCtx } from "./types";

export const queueConfigSchema = z.object({
  /** Visible per-season "steal points" leaderboard (PUG-only). */
  stealPoints: z.boolean().default(true),
  /** Skill cohort band for this PUG league (drives matchmaking banding). */
  cohort: z.string().optional(),
});

export type QueueConfig = z.infer<typeof queueConfigSchema>;

export const queueDriver: FormatDriver = {
  slug: "queue",
  label: "PUG Queue",
  description: "Matchmaker-fed PUG with hidden Elo + visible steal-points seasons.",
  teamBased: false, // ranks individual players
  configSchema: queueConfigSchema,
  defaultConfig: () => queueConfigSchema.parse({}),

  /** Award steal points to each player based on team result + margin. */
  async onMatchCompleted(ctx: MatchCompletedCtx): Promise<void> {
    const roster = await db
      .select({ steamid64: matchPlayers.steamid64, team: matchPlayers.team })
      .from(matchPlayers)
      .where(eq(matchPlayers.matchId, ctx.matchId));
    if (roster.length === 0) return;

    const pts = stealPointsByTeam(ctx.scoreHome, ctx.scoreAway, ctx.winnerTeam);

    for (const r of roster) {
      if (r.team !== 1 && r.team !== 2) continue;
      const delta = r.team === 1 ? pts.team1 : pts.team2;
      const won = ctx.winnerTeam !== null && r.team === ctx.winnerTeam;
      const lost = ctx.winnerTeam !== null && r.team !== ctx.winnerTeam;
      await db
        .insert(competitionStandings)
        .values({
          stageId: ctx.stageId,
          steamid64: r.steamid64,
          points: String(delta),
          wins: won ? 1 : 0,
          losses: lost ? 1 : 0,
          matchesPlayed: 1,
        })
        .onConflictDoUpdate({
          target: [competitionStandings.stageId, competitionStandings.steamid64],
          targetWhere: sql`${competitionStandings.steamid64} IS NOT NULL`,
          set: {
            points: sql`${competitionStandings.points} + ${delta}`,
            wins: sql`${competitionStandings.wins} + ${won ? 1 : 0}`,
            losses: sql`${competitionStandings.losses} + ${lost ? 1 : 0}`,
            matchesPlayed: sql`${competitionStandings.matchesPlayed} + 1`,
            updatedAt: sql`now()`,
          },
        });
    }

    await this.computeStandings?.({
      stageId: ctx.stageId,
      seasonId: ctx.seasonId,
      competitionId: "",
      config: {},
    });
  },

  /** Rank players by points desc (ties broken by fewer losses, then steamid). */
  async computeStandings(ctx: StageCtx): Promise<void> {
    const rows = await db
      .select({ id: competitionStandings.id })
      .from(competitionStandings)
      .where(eq(competitionStandings.stageId, ctx.stageId))
      .orderBy(
        desc(competitionStandings.points),
        asc(competitionStandings.losses),
        asc(competitionStandings.steamid64),
      );
    let rank = 1;
    for (const r of rows) {
      await db
        .update(competitionStandings)
        .set({ rank, updatedAt: sql`now()` })
        .where(eq(competitionStandings.id, r.id));
      rank += 1;
    }
  },
};
