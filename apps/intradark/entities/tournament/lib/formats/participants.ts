/**
 * Resolve the entrants participating in a stage. If the stage has explicit
 * participants (competition_stage_entrants — set by stage advancement in a
 * composite event), use those; otherwise fall back to all season entrants (the
 * simple single-stage case). Ordered by seed for bracket seeding.
 */
import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionEntrants,
  competitionStageEntrants,
} from "@/server/db/schema";

export interface StageParticipant {
  id: string;
  seed: number | null;
}

export async function getStageParticipants(
  stageId: string,
  seasonId: string,
): Promise<StageParticipant[]> {
  const explicit = await db
    .select({ id: competitionStageEntrants.entrantId, seed: competitionStageEntrants.seed })
    .from(competitionStageEntrants)
    .where(eq(competitionStageEntrants.stageId, stageId))
    .orderBy(sql`${competitionStageEntrants.seed} asc nulls last`);
  if (explicit.length > 0) return explicit;

  return db
    .select({ id: competitionEntrants.id, seed: competitionEntrants.seed })
    .from(competitionEntrants)
    .where(eq(competitionEntrants.seasonId, seasonId))
    .orderBy(
      sql`${competitionEntrants.seed} asc nulls last`,
      asc(competitionEntrants.createdAt),
    );
}
