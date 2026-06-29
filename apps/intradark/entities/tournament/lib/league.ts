/**
 * League service: generate the round-robin schedule and turn a scheduled fixture
 * into a real match (rosters → matches engine). Results flow back through
 * finalizeMatch → the league driver (table recompute). See plan §3.1 / P4.
 */
import "server-only";

import { eq, inArray, sql } from "drizzle-orm";

import { DEFAULT_RATING } from "@/entities/match-queue/lib/leagues";
import { db } from "@/server/db/drizzle";
import {
  competitionEntrantMembers,
  competitionFixtures,
  competitionStages,
  matchPlayers,
  matches,
  playerRatings,
} from "@/server/db/schema";

import { writeAudit } from "./audit";
import { requireDriver } from "./formats/registry";

async function loadStage(stageId: string) {
  const [stage] = await db
    .select({
      id: competitionStages.id,
      seasonId: competitionStages.seasonId,
      format: competitionStages.format,
      formatConfig: competitionStages.formatConfig,
    })
    .from(competitionStages)
    .where(eq(competitionStages.id, stageId))
    .limit(1);
  return stage ?? null;
}

/** Generate (or regenerate unplayed) fixtures for a league stage. */
export async function generateLeagueSchedule(
  stageId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const stage = await loadStage(stageId);
  if (!stage) return { ok: false, error: "Stage not found." };
  const driver = requireDriver(stage.format);
  if (!driver.generateSchedule) {
    return { ok: false, error: `Format ${stage.format} has no schedule.` };
  }
  await driver.generateSchedule({
    stageId: stage.id,
    seasonId: stage.seasonId,
    competitionId: "",
    config: (stage.formatConfig ?? {}) as Record<string, unknown>,
  });
  await writeAudit({
    seasonId: stage.seasonId,
    actorUserId,
    action: "league.generate_schedule",
    target: stageId,
  });
  return { ok: true };
}

async function rosterEloPlayers(entrantId: string) {
  const members = await db
    .select({ steamid64: competitionEntrantMembers.steamid64 })
    .from(competitionEntrantMembers)
    .where(eq(competitionEntrantMembers.entrantId, entrantId));
  const ids = members.map((m) => m.steamid64);
  if (ids.length === 0) return [] as { steamid64: string; rating: number }[];
  const ratings = await db
    .select({ steamid64: playerRatings.steamid64, rating: playerRatings.rating })
    .from(playerRatings)
    .where(inArray(playerRatings.steamid64, ids));
  const byId = new Map(ratings.map((r) => [r.steamid64, r.rating]));
  return ids.map((steamid64) => ({ steamid64, rating: byId.get(steamid64) ?? DEFAULT_RATING }));
}

/** Create the match for a fixture (home=team1, away=team2) with both rosters. */
export async function playFixture(
  fixtureId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; matchId?: string; error?: string }> {
  const [fixture] = await db
    .select()
    .from(competitionFixtures)
    .where(eq(competitionFixtures.id, fixtureId))
    .limit(1);
  if (!fixture) return { ok: false, error: "Fixture not found." };
  if (fixture.matchId) return { ok: true, matchId: fixture.matchId };
  if (!fixture.homeEntrantId || !fixture.awayEntrantId) {
    return { ok: false, error: "Fixture has no opponents yet." };
  }

  const stage = await loadStage(fixture.stageId);
  if (!stage) return { ok: false, error: "Stage not found." };

  const [home, away] = await Promise.all([
    rosterEloPlayers(fixture.homeEntrantId),
    rosterEloPlayers(fixture.awayEntrantId),
  ]);

  const matchId = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(matches)
      .values({
        league: "league",
        status: "configuring",
        matchSource: "fixture",
        seasonId: stage.seasonId,
        stageId: stage.id,
        homeEntrantId: fixture.homeEntrantId,
        awayEntrantId: fixture.awayEntrantId,
      })
      .returning({ id: matches.id });
    if (!m) throw new Error("Failed to create match");

    const rows = [
      ...home.map((p) => ({ matchId: m.id, steamid64: p.steamid64, team: 1, ratingAtQueue: p.rating })),
      ...away.map((p) => ({ matchId: m.id, steamid64: p.steamid64, team: 2, ratingAtQueue: p.rating })),
    ];
    if (rows.length) await tx.insert(matchPlayers).values(rows).onConflictDoNothing();

    await tx
      .update(competitionFixtures)
      .set({ matchId: m.id, status: "scheduled", updatedAt: sql`now()` })
      .where(eq(competitionFixtures.id, fixtureId));

    return m.id;
  });

  await writeAudit({
    seasonId: stage.seasonId,
    actorUserId,
    action: "league.play_fixture",
    target: fixtureId,
    after: { matchId },
  });
  return { ok: true, matchId };
}
