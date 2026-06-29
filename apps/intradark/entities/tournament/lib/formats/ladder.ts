/**
 * Positional ladder driver (CyberGamer-style). Rank position IS the standing.
 * Challenge up only, within ±range; mandatory accept; swap-on-win. New entrants
 * join at the bottom. See docs/tournaments/plan.md §3.2.
 */
import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/drizzle";
import {
  competitionEntrants,
  competitionStages,
  competitionStandings,
} from "@/server/db/schema";

import type {
  CanCreateMatchArgs,
  FormatDriver,
  GateResult,
  MatchCompletedCtx,
  StageCtx,
} from "./types";

export const ladderConfigSchema = z.object({
  /** Max positions above you that you may challenge. */
  challengeRange: z.number().int().positive().default(3),
  /** Climb-only (up) vs either direction. */
  direction: z.enum(["up", "both"]).default("up"),
  /** Defending is mandatory (decline = forfeit = loss). */
  mandatoryAccept: z.boolean().default(true),
  /** swap = trade positions; shift = insert + cascade (future). */
  resolution: z.enum(["swap", "shift"]).default("swap"),
  /** Can't re-challenge the same entrant within this window. */
  rematchCooldownHours: z.number().int().nonnegative().default(12),
  /** A pending challenge expires (→ forfeit) after this. */
  challengeExpiryHours: z.number().int().positive().default(24),
  /** Consecutive forfeits before optional auto-removal. */
  forfeitsBeforeRemoval: z.number().int().positive().default(3),
});

export type LadderConfig = z.infer<typeof ladderConfigSchema>;

/** Pure: is a challenge from challengerRank against challengedRank legal? */
export function ladderChallengeAllowed(
  challengerRank: number,
  challengedRank: number,
  config: Pick<LadderConfig, "challengeRange" | "direction">,
): GateResult {
  if (challengerRank === challengedRank) {
    return { allowed: false, reason: "You can't challenge yourself." };
  }
  const gap = challengerRank - challengedRank; // positive = target is above you
  if (config.direction === "up" && gap <= 0) {
    return { allowed: false, reason: "You can only challenge teams ranked above you." };
  }
  if (Math.abs(gap) > config.challengeRange) {
    return {
      allowed: false,
      reason: `Out of range — challenges must be within ${config.challengeRange} positions.`,
    };
  }
  return { allowed: true };
}

/** Pure: given the two ranks and who won, return each entrant's new rank (swap). */
export function resolveSwap(
  challengerRank: number,
  challengedRank: number,
  challengerWon: boolean,
): { challengerRank: number; challengedRank: number } {
  if (!challengerWon) {
    return { challengerRank, challengedRank }; // defender holds
  }
  // Winner takes the better (smaller) rank number.
  return { challengerRank: challengedRank, challengedRank: challengerRank };
}

async function rankOf(entrantId: string): Promise<number | null> {
  const [row] = await db
    .select({ rank: competitionEntrants.ladderRank })
    .from(competitionEntrants)
    .where(eq(competitionEntrants.id, entrantId))
    .limit(1);
  return row?.rank ?? null;
}

export const ladderDriver: FormatDriver = {
  slug: "ladder",
  label: "Open Ladder",
  description:
    "Positional ladder — challenge up to N ranks above you, mandatory accept, swap on win.",
  teamBased: true,
  configSchema: ladderConfigSchema,
  defaultConfig: () => ladderConfigSchema.parse({}),

  /** No pre-set schedule; ladders are seeded as entrants join (service handles it). */
  async generateSchedule() {
    /* no-op: positions are assigned at registration (bottom of ladder). */
  },

  async canCreateMatch({
    stage,
    challengerEntrantId,
    challengedEntrantId,
  }: CanCreateMatchArgs): Promise<GateResult> {
    const config = ladderConfigSchema.parse(stage.config ?? {});
    const [a, b] = await Promise.all([
      rankOf(challengerEntrantId),
      rankOf(challengedEntrantId),
    ]);
    if (a == null || b == null) {
      return { allowed: false, reason: "Both teams must be ranked on the ladder." };
    }
    return ladderChallengeAllowed(a, b, config);
  },

  /** Swap ladder positions: winner takes the better rank. */
  async onMatchCompleted(ctx: MatchCompletedCtx): Promise<void> {
    const { homeEntrantId, awayEntrantId, winnerEntrantId } = ctx;
    if (!homeEntrantId || !awayEntrantId || !winnerEntrantId) return;

    const [homeRank, awayRank] = await Promise.all([
      rankOf(homeEntrantId),
      rankOf(awayEntrantId),
    ]);
    if (homeRank == null || awayRank == null) return;

    const winnerRank = winnerEntrantId === homeEntrantId ? homeRank : awayRank;
    const loserRank = winnerEntrantId === homeEntrantId ? awayRank : homeRank;
    const loserEntrantId =
      winnerEntrantId === homeEntrantId ? awayEntrantId : homeEntrantId;

    const better = Math.min(winnerRank, loserRank);
    const worse = Math.max(winnerRank, loserRank);
    if (better === worse) return;

    // Winner takes the better (smaller) rank; loser takes the worse.
    await db.transaction(async (tx) => {
      // Park the loser at a sentinel to dodge the unique (season, rank) index.
      await tx
        .update(competitionEntrants)
        .set({ ladderRank: -1, updatedAt: sql`now()` })
        .where(eq(competitionEntrants.id, loserEntrantId));
      await tx
        .update(competitionEntrants)
        .set({ ladderRank: better, updatedAt: sql`now()` })
        .where(eq(competitionEntrants.id, winnerEntrantId));
      await tx
        .update(competitionEntrants)
        .set({ ladderRank: worse, updatedAt: sql`now()` })
        .where(eq(competitionEntrants.id, loserEntrantId));
    });

    await this.computeStandings?.({
      stageId: ctx.stageId,
      seasonId: ctx.seasonId,
      competitionId: "",
      config: {},
    });
  },

  /** Standings mirror ladder_rank; W/L carried for display. */
  async computeStandings(ctx: StageCtx): Promise<void> {
    const [stage] = await db
      .select({ seasonId: competitionStages.seasonId })
      .from(competitionStages)
      .where(eq(competitionStages.id, ctx.stageId))
      .limit(1);
    if (!stage) return;

    const entrants = await db
      .select({ id: competitionEntrants.id, rank: competitionEntrants.ladderRank })
      .from(competitionEntrants)
      .where(
        and(
          eq(competitionEntrants.seasonId, stage.seasonId),
          isNotNull(competitionEntrants.ladderRank),
        ),
      );

    for (const e of entrants) {
      await db
        .insert(competitionStandings)
        .values({ stageId: ctx.stageId, entrantId: e.id, rank: e.rank ?? null })
        .onConflictDoUpdate({
          target: [competitionStandings.stageId, competitionStandings.entrantId],
          targetWhere: isNotNull(competitionStandings.entrantId),
          set: { rank: e.rank ?? null, updatedAt: sql`now()` },
        });
    }
  },
};
