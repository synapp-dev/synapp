/**
 * Tournament side of match finalization. Called by the shared finalizeMatch seam
 * (entities/match-queue/lib/finalize.ts) whenever a completed match carries a
 * season_id/stage_id. Resolves the stage's format driver and runs its
 * onMatchCompleted (bracket advance / ladder swap) + standings recompute.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { competitionStages } from "@/server/db/schema";

import { getDriver } from "./formats/registry";
import type { MatchCompletedCtx } from "./formats/types";

export interface CompetitionMatchResult {
  matchId: string;
  seasonId: string;
  stageId: string;
  homeEntrantId: string | null;
  awayEntrantId: string | null;
  /** 1 = home won, 2 = away won, null = draw. */
  winnerTeam: 1 | 2 | null;
  scoreHome: number;
  scoreAway: number;
}

/** Run the stage driver's completion + standings logic for a finished match. */
export async function onCompetitionMatchCompleted(
  result: CompetitionMatchResult,
): Promise<void> {
  const [stage] = await db
    .select({
      id: competitionStages.id,
      seasonId: competitionStages.seasonId,
      format: competitionStages.format,
      formatConfig: competitionStages.formatConfig,
    })
    .from(competitionStages)
    .where(eq(competitionStages.id, result.stageId))
    .limit(1);
  if (!stage) return;

  const driver = getDriver(stage.format);
  if (!driver?.onMatchCompleted) return;

  const winnerEntrantId =
    result.winnerTeam === 1
      ? result.homeEntrantId
      : result.winnerTeam === 2
        ? result.awayEntrantId
        : null;

  const ctx: MatchCompletedCtx = {
    matchId: result.matchId,
    stageId: stage.id,
    seasonId: stage.seasonId,
    homeEntrantId: result.homeEntrantId,
    awayEntrantId: result.awayEntrantId,
    winnerEntrantId,
    winnerTeam: result.winnerTeam,
    scoreHome: result.scoreHome,
    scoreAway: result.scoreAway,
  };

  await driver.onMatchCompleted(ctx);
}
