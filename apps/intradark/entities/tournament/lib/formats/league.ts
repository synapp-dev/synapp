/**
 * League driver (round-robin). Generates a fixture schedule (single/double), and
 * recomputes a points table with a configurable tiebreaker chain whenever a
 * fixture's match completes. See docs/tournaments/plan.md §3.1.
 */
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/drizzle";
import {
  competitionFixtures,
  competitionStandings,
  competitionStages,
  matchResults,
  matches,
} from "@/server/db/schema";

import { getStageParticipants } from "./participants";
import { roundRobinPairings } from "./round-robin";
import type { FormatDriver, MatchCompletedCtx, StageCtx } from "./types";

export const leagueConfigSchema = z.object({
  roundRobin: z.enum(["single", "double"]).default("single"),
  pointsWin: z.number().int().default(3),
  pointsDraw: z.number().int().default(1),
  pointsLoss: z.number().int().default(0),
  tiebreakers: z
    .array(z.enum(["head_to_head", "round_diff", "rounds_won", "maps_won"]))
    .default(["head_to_head", "round_diff", "rounds_won"]),
});

export type LeagueConfig = z.infer<typeof leagueConfigSchema>;

interface Tally {
  entrantId: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  rf: number;
  ra: number;
  played: number;
}

export const leagueDriver: FormatDriver = {
  slug: "league",
  label: "League",
  description: "Round-robin fixtures, points table with configurable tiebreakers.",
  teamBased: true,
  configSchema: leagueConfigSchema,
  defaultConfig: () => leagueConfigSchema.parse({}),

  /** Generate the round-robin fixture list from the season's entrants. */
  async generateSchedule(ctx: StageCtx): Promise<void> {
    const config = leagueConfigSchema.parse(ctx.config ?? {});
    const entrants = await getStageParticipants(ctx.stageId, ctx.seasonId);
    const ids = entrants.map((e) => e.id);
    if (ids.length < 2) return;

    // Clear any prior generated (unplayed) fixtures for idempotent regeneration.
    await db
      .delete(competitionFixtures)
      .where(
        and(
          eq(competitionFixtures.stageId, ctx.stageId),
          eq(competitionFixtures.status, "pending"),
        ),
      );

    const pairings = roundRobinPairings(ids, config.roundRobin === "double");
    if (pairings.length === 0) return;
    await db.insert(competitionFixtures).values(
      pairings.map((p) => ({
        stageId: ctx.stageId,
        round: p.round,
        homeEntrantId: p.home,
        awayEntrantId: p.away,
        status: "pending" as const,
      })),
    );
  },

  /** Mark the fixture played, then recompute the table. */
  async onMatchCompleted(ctx: MatchCompletedCtx): Promise<void> {
    await db
      .update(competitionFixtures)
      .set({ status: "completed", updatedAt: sql`now()` })
      .where(eq(competitionFixtures.matchId, ctx.matchId));
    await this.computeStandings?.({
      stageId: ctx.stageId,
      seasonId: ctx.seasonId,
      competitionId: "",
      config: {},
    });
  },

  /** Recompute the full table from completed matches (idempotent). */
  async computeStandings(ctx: StageCtx): Promise<void> {
    const [stageRow] = await db
      .select({ formatConfig: competitionStages.formatConfig })
      .from(competitionStages)
      .where(eq(competitionStages.id, ctx.stageId))
      .limit(1);
    const config = leagueConfigSchema.parse(
      (stageRow?.formatConfig as Record<string, unknown>) ?? {},
    );

    const played = await db
      .select({
        homeEntrantId: matches.homeEntrantId,
        awayEntrantId: matches.awayEntrantId,
        winnerTeam: matchResults.winnerTeam,
        scoreTeam1: matchResults.scoreTeam1,
        scoreTeam2: matchResults.scoreTeam2,
      })
      .from(matches)
      .innerJoin(matchResults, eq(matchResults.matchId, matches.id))
      .where(and(eq(matches.stageId, ctx.stageId), eq(matches.status, "completed")));

    const entrants = await getStageParticipants(ctx.stageId, ctx.seasonId);

    const tally = new Map<string, Tally>();
    for (const e of entrants) {
      tally.set(e.id, {
        entrantId: e.id,
        points: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        rf: 0,
        ra: 0,
        played: 0,
      });
    }
    // head-to-head points between ordered pair "a|b".
    const h2h = new Map<string, number>();
    const addH2H = (a: string, b: string, pts: number) =>
      h2h.set(`${a}|${b}`, (h2h.get(`${a}|${b}`) ?? 0) + pts);

    for (const m of played) {
      if (!m.homeEntrantId || !m.awayEntrantId) continue;
      const home = tally.get(m.homeEntrantId);
      const away = tally.get(m.awayEntrantId);
      if (!home || !away) continue;
      home.played++; away.played++;
      home.rf += m.scoreTeam1; home.ra += m.scoreTeam2;
      away.rf += m.scoreTeam2; away.ra += m.scoreTeam1;
      if (m.winnerTeam === 1) {
        home.wins++; home.points += config.pointsWin;
        away.losses++; away.points += config.pointsLoss;
        addH2H(m.homeEntrantId, m.awayEntrantId, config.pointsWin);
        addH2H(m.awayEntrantId, m.homeEntrantId, config.pointsLoss);
      } else if (m.winnerTeam === 2) {
        away.wins++; away.points += config.pointsWin;
        home.losses++; home.points += config.pointsLoss;
        addH2H(m.awayEntrantId, m.homeEntrantId, config.pointsWin);
        addH2H(m.homeEntrantId, m.awayEntrantId, config.pointsLoss);
      } else {
        home.draws++; away.draws++;
        home.points += config.pointsDraw; away.points += config.pointsDraw;
        addH2H(m.homeEntrantId, m.awayEntrantId, config.pointsDraw);
        addH2H(m.awayEntrantId, m.homeEntrantId, config.pointsDraw);
      }
    }

    const cmp = (a: Tally, b: Tally): number => {
      if (b.points !== a.points) return b.points - a.points;
      for (const tb of config.tiebreakers) {
        if (tb === "head_to_head") {
          const ab = h2h.get(`${a.entrantId}|${b.entrantId}`) ?? 0;
          const ba = h2h.get(`${b.entrantId}|${a.entrantId}`) ?? 0;
          if (ab !== ba) return ba - ab;
        } else if (tb === "round_diff") {
          const da = a.rf - a.ra;
          const dbb = b.rf - b.ra;
          if (da !== dbb) return dbb - da;
        } else if (tb === "rounds_won" || tb === "maps_won") {
          if (a.rf !== b.rf) return b.rf - a.rf;
        }
      }
      return a.entrantId.localeCompare(b.entrantId);
    };

    const ordered = [...tally.values()].sort(cmp);
    let rank = 1;
    for (const t of ordered) {
      await db
        .insert(competitionStandings)
        .values({
          stageId: ctx.stageId,
          entrantId: t.entrantId,
          rank,
          points: String(t.points),
          wins: t.wins,
          draws: t.draws,
          losses: t.losses,
          roundsFor: t.rf,
          roundsAgainst: t.ra,
          matchesPlayed: t.played,
        })
        .onConflictDoUpdate({
          target: [competitionStandings.stageId, competitionStandings.entrantId],
          targetWhere: sql`${competitionStandings.entrantId} IS NOT NULL`,
          set: {
            rank,
            points: String(t.points),
            wins: t.wins,
            draws: t.draws,
            losses: t.losses,
            roundsFor: t.rf,
            roundsAgainst: t.ra,
            matchesPlayed: t.played,
            updatedAt: sql`now()`,
          },
        });
      rank++;
    }
  },
};
