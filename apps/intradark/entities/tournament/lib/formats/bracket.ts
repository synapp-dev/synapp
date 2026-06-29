/**
 * Bracket driver. Single-elimination (byes to top seeds) and double-elimination
 * (winners + losers bracket, power-of-two fields). Seeds entrants, builds the
 * tree, auto-advances winners (and drops losers into the LB for double-elim) as
 * matches complete, and computes final placement. GF bracket-reset is not yet
 * modelled (single grand final). See docs/tournaments/plan.md §3.1.
 */
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db/drizzle";
import {
  competitionFixtures,
  competitionStandings,
  matchResults,
  matches,
} from "@/server/db/schema";

import { buildSingleElim } from "./bracket-tree";
import { buildDoubleElim, isPowerOfTwo } from "./double-elim";
import { getStageParticipants } from "./participants";
import type { FormatDriver, MatchCompletedCtx, StageCtx } from "./types";

export const bracketConfigSchema = z.object({
  elimination: z.enum(["single", "double"]).default("single"),
  thirdPlace: z.boolean().default(false),
  grandFinalReset: z.boolean().default(false),
});

export type BracketConfig = z.infer<typeof bracketConfigSchema>;

const slotKey = (round: number, index: number) => `${round}:${index}`;

export const bracketDriver: FormatDriver = {
  slug: "bracket",
  label: "Bracket",
  description: "Single or double elimination with byes and auto-advance.",
  teamBased: true,
  configSchema: bracketConfigSchema,
  defaultConfig: () => bracketConfigSchema.parse({}),

  /** Seed entrants and lay out the bracket (single- or double-elim). */
  async generateSchedule(ctx: StageCtx): Promise<void> {
    const config = bracketConfigSchema.parse(ctx.config ?? {});
    const seeded = await getStageParticipants(ctx.stageId, ctx.seasonId);
    if (seeded.length < 2) return;

    await db
      .delete(competitionFixtures)
      .where(
        and(
          eq(competitionFixtures.stageId, ctx.stageId),
          eq(competitionFixtures.status, "pending"),
        ),
      );

    // Double-elim requires a power-of-two field (≥4); otherwise fall back to single.
    if (
      config.elimination === "double" &&
      isPowerOfTwo(seeded.length) &&
      seeded.length >= 4
    ) {
      const tree = buildDoubleElim(seeded.length);
      const idByKey = new Map<string, string>();
      for (const m of tree) {
        const homeId = m.homeSeed != null ? seeded[m.homeSeed]?.id ?? null : null;
        const awayId = m.awaySeed != null ? seeded[m.awaySeed]?.id ?? null : null;
        const [row] = await db
          .insert(competitionFixtures)
          .values({
            stageId: ctx.stageId,
            round: m.round,
            bracket: m.bracket,
            bracketSlot: m.key,
            homeEntrantId: homeId,
            awayEntrantId: awayId,
            status: "pending",
          })
          .returning({ id: competitionFixtures.id });
        if (row) idByKey.set(m.key, row.id);
      }
      for (const m of tree) {
        const id = idByKey.get(m.key);
        if (!id) continue;
        await db
          .update(competitionFixtures)
          .set({
            nextFixtureId: m.winnerTo ? idByKey.get(m.winnerTo) ?? null : null,
            nextSlot: m.winnerSlot,
            loserFixtureId: m.loserTo ? idByKey.get(m.loserTo) ?? null : null,
            loserSlot: m.loserSlot,
          })
          .where(eq(competitionFixtures.id, id));
      }
      return;
    }

    const tree = buildSingleElim(seeded.length);
    const idByPos = new Map<string, string>();

    // Pass 1: insert all fixtures (round-1 sides resolved from seeds).
    for (const m of tree.matches) {
      const homeId = m.homeSeed != null ? seeded[m.homeSeed]?.id ?? null : null;
      const awayId = m.awaySeed != null ? seeded[m.awaySeed]?.id ?? null : null;
      const [row] = await db
        .insert(competitionFixtures)
        .values({
          stageId: ctx.stageId,
          round: m.round,
          bracketSlot: `R${m.round}M${m.index}`,
          homeEntrantId: homeId,
          awayEntrantId: awayId,
          status: "pending",
        })
        .returning({ id: competitionFixtures.id });
      if (row) idByPos.set(slotKey(m.round, m.index), row.id);
    }

    // Pass 2: wire next_fixture pointers.
    for (const m of tree.matches) {
      if (m.nextRound == null || m.nextIndex == null) continue;
      const id = idByPos.get(slotKey(m.round, m.index));
      const nextId = idByPos.get(slotKey(m.nextRound, m.nextIndex));
      if (id && nextId) {
        await db
          .update(competitionFixtures)
          .set({ nextFixtureId: nextId, nextSlot: m.nextSlot })
          .where(eq(competitionFixtures.id, id));
      }
    }

    // Byes: a round-1 match with one entrant auto-advances it; source → 'bye'.
    for (const m of tree.matches) {
      if (m.round !== 1) continue;
      const present =
        m.homeSeed != null && m.awaySeed == null
          ? m.homeSeed
          : m.awaySeed != null && m.homeSeed == null
            ? m.awaySeed
            : null;
      if (present == null || m.nextRound == null) continue;
      const advancingId = seeded[present]?.id;
      const targetId = idByPos.get(slotKey(m.nextRound, m.nextIndex!));
      const sourceId = idByPos.get(slotKey(m.round, m.index));
      if (advancingId && targetId) {
        await db
          .update(competitionFixtures)
          .set(
            m.nextSlot === "home"
              ? { homeEntrantId: advancingId }
              : { awayEntrantId: advancingId },
          )
          .where(eq(competitionFixtures.id, targetId));
      }
      if (sourceId) {
        await db
          .update(competitionFixtures)
          .set({ status: "bye", updatedAt: sql`now()` })
          .where(eq(competitionFixtures.id, sourceId));
      }
    }
  },

  /** Advance the winner (and, for double-elim, drop the loser), then re-rank. */
  async onMatchCompleted(ctx: MatchCompletedCtx): Promise<void> {
    const [fx] = await db
      .select({
        id: competitionFixtures.id,
        nextFixtureId: competitionFixtures.nextFixtureId,
        nextSlot: competitionFixtures.nextSlot,
        loserFixtureId: competitionFixtures.loserFixtureId,
        loserSlot: competitionFixtures.loserSlot,
      })
      .from(competitionFixtures)
      .where(eq(competitionFixtures.matchId, ctx.matchId))
      .limit(1);
    if (!fx) return;

    await db
      .update(competitionFixtures)
      .set({ status: "completed", updatedAt: sql`now()` })
      .where(eq(competitionFixtures.id, fx.id));

    if (fx.nextFixtureId && ctx.winnerEntrantId) {
      await db
        .update(competitionFixtures)
        .set(
          fx.nextSlot === "home"
            ? { homeEntrantId: ctx.winnerEntrantId }
            : { awayEntrantId: ctx.winnerEntrantId },
        )
        .where(eq(competitionFixtures.id, fx.nextFixtureId));
    }

    // Double-elim: the loser drops into the losers bracket.
    const loserEntrantId =
      ctx.winnerTeam === 1
        ? ctx.awayEntrantId
        : ctx.winnerTeam === 2
          ? ctx.homeEntrantId
          : null;
    if (fx.loserFixtureId && loserEntrantId) {
      await db
        .update(competitionFixtures)
        .set(
          fx.loserSlot === "home"
            ? { homeEntrantId: loserEntrantId }
            : { awayEntrantId: loserEntrantId },
        )
        .where(eq(competitionFixtures.id, fx.loserFixtureId));
    }

    await this.computeStandings?.({
      stageId: ctx.stageId,
      seasonId: ctx.seasonId,
      competitionId: "",
      config: {},
    });
  },

  /** Placement by elimination round (champion = won the final). */
  async computeStandings(ctx: StageCtx): Promise<void> {
    const fixtures = await db
      .select({
        round: competitionFixtures.round,
        bracket: competitionFixtures.bracket,
        nextFixtureId: competitionFixtures.nextFixtureId,
        homeEntrantId: competitionFixtures.homeEntrantId,
        awayEntrantId: competitionFixtures.awayEntrantId,
        winnerTeam: matchResults.winnerTeam,
      })
      .from(competitionFixtures)
      .leftJoin(matches, eq(matches.id, competitionFixtures.matchId))
      .leftJoin(matchResults, eq(matchResults.matchId, matches.id))
      .where(eq(competitionFixtures.stageId, ctx.stageId));

    const elimRound = new Map<string, number>(); // entrant → round eliminated
    let champion: string | null = null;

    for (const f of fixtures) {
      if (f.winnerTeam == null || !f.homeEntrantId || !f.awayEntrantId) continue;
      const winner = f.winnerTeam === 1 ? f.homeEntrantId : f.awayEntrantId;
      const loser = f.winnerTeam === 1 ? f.awayEntrantId : f.homeEntrantId;
      // In double-elim a WB loss isn't elimination (the loser drops to the LB);
      // only LB and GF losses eliminate. Single-elim (bracket null) always does.
      const eliminates = f.bracket == null || f.bracket === "lb" || f.bracket === "gf";
      if (eliminates) {
        // Rank later eliminations higher: use a monotonic key (gf > lb > wb-by-round).
        const weight = f.bracket === "gf" ? 10_000 : (f.round ?? 0);
        elimRound.set(loser, weight);
      }
      if (f.nextFixtureId == null) champion = winner; // won the (grand) final
    }

    const entrants = await getStageParticipants(ctx.stageId, ctx.seasonId);

    // Rank: champion first, then by elimination round desc, seed asc.
    const ranked = [...entrants].sort((a, b) => {
      if (a.id === champion) return -1;
      if (b.id === champion) return 1;
      const ea = elimRound.get(a.id) ?? 0;
      const eb = elimRound.get(b.id) ?? 0;
      if (ea !== eb) return eb - ea;
      return (a.seed ?? 9999) - (b.seed ?? 9999);
    });

    let rank = 1;
    for (const e of ranked) {
      const placement = e.id === champion ? 1 : rank;
      await db
        .insert(competitionStandings)
        .values({
          stageId: ctx.stageId,
          entrantId: e.id,
          rank,
          finalPlacement: placement,
        })
        .onConflictDoUpdate({
          target: [competitionStandings.stageId, competitionStandings.entrantId],
          targetWhere: sql`${competitionStandings.entrantId} IS NOT NULL`,
          set: { rank, finalPlacement: placement, updatedAt: sql`now()` },
        });
      rank++;
    }
  },
};
