/**
 * Multi-stage orchestration (composite events, plan §2). Add stages to a season
 * and advance the top-N from one stage into the next (groups → playoffs). The
 * advancing entrants become the next stage's explicit participants (seeded by
 * their finishing rank), and that stage's schedule is generated.
 */
import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionStageEntrants,
  competitionStandings,
  competitionStages,
} from "@/server/db/schema";

import { writeAudit } from "./audit";
import { requireDriver } from "./formats/registry";

export interface AddStageInput {
  seasonId: string;
  name: string;
  format: string;
  formatConfig?: Record<string, unknown>;
  /** e.g. { topN: 8 } — how many advance FROM this stage. */
  advancementRule?: Record<string, unknown>;
}

export async function addStage(
  input: AddStageInput,
  actorUserId: string | null,
): Promise<{ ok: boolean; stageId?: string; error?: string }> {
  const driver = requireDriver(input.format);
  const config = driver.configSchema.parse(input.formatConfig ?? {});

  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(${competitionStages.sortOrder}), -1)` })
    .from(competitionStages)
    .where(eq(competitionStages.seasonId, input.seasonId));
  const sortOrder = Number(maxRow?.max ?? -1) + 1;

  const [stage] = await db
    .insert(competitionStages)
    .values({
      seasonId: input.seasonId,
      sortOrder,
      name: input.name,
      format: input.format,
      formatConfig: config as never,
      advancementRule: (input.advancementRule ?? {}) as never,
      status: "pending",
    })
    .returning({ id: competitionStages.id });
  if (!stage) return { ok: false, error: "Failed to add stage" };

  await writeAudit({
    seasonId: input.seasonId,
    actorUserId,
    action: "stage.add",
    target: stage.id,
    after: { name: input.name, format: input.format, sortOrder },
  });
  return { ok: true, stageId: stage.id };
}

/**
 * Advance the top-N (from advancement_rule.topN) of `fromStageId` into the next
 * stage as seeded participants, then generate that stage's schedule.
 */
export async function advanceStage(
  fromStageId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; nextStageId?: string; advanced?: number; error?: string }> {
  const [fromStage] = await db
    .select({
      id: competitionStages.id,
      seasonId: competitionStages.seasonId,
      sortOrder: competitionStages.sortOrder,
      advancementRule: competitionStages.advancementRule,
    })
    .from(competitionStages)
    .where(eq(competitionStages.id, fromStageId))
    .limit(1);
  if (!fromStage) return { ok: false, error: "Stage not found." };

  const topN = Number(
    (fromStage.advancementRule as { topN?: number } | null)?.topN ?? 0,
  );
  if (!topN || topN < 1) {
    return { ok: false, error: "Stage has no advancement rule (topN)." };
  }

  const [nextStage] = await db
    .select({
      id: competitionStages.id,
      seasonId: competitionStages.seasonId,
      format: competitionStages.format,
      formatConfig: competitionStages.formatConfig,
    })
    .from(competitionStages)
    .where(
      and(
        eq(competitionStages.seasonId, fromStage.seasonId),
        eq(competitionStages.sortOrder, fromStage.sortOrder + 1),
      ),
    )
    .limit(1);
  if (!nextStage) return { ok: false, error: "No next stage to advance into." };

  const advancers = await db
    .select({ entrantId: competitionStandings.entrantId, rank: competitionStandings.rank })
    .from(competitionStandings)
    .where(
      and(
        eq(competitionStandings.stageId, fromStageId),
        isNotNull(competitionStandings.entrantId),
      ),
    )
    .orderBy(sql`${competitionStandings.rank} asc nulls last`)
    .limit(topN);
  if (advancers.length === 0) {
    return { ok: false, error: "No standings to advance — finish the stage first." };
  }

  await db.transaction(async (tx) => {
    // Reset prior participants (idempotent re-advance).
    await tx
      .delete(competitionStageEntrants)
      .where(eq(competitionStageEntrants.stageId, nextStage.id));
    await tx.insert(competitionStageEntrants).values(
      advancers.map((a, i) => ({
        stageId: nextStage.id,
        entrantId: a.entrantId!,
        seed: a.rank ?? i + 1,
      })),
    );
    await tx
      .update(competitionStages)
      .set({ status: "completed", updatedAt: sql`now()` })
      .where(eq(competitionStages.id, fromStageId));
    await tx
      .update(competitionStages)
      .set({ status: "active", updatedAt: sql`now()` })
      .where(eq(competitionStages.id, nextStage.id));
  });

  // Generate the next stage's schedule from its new participants.
  const driver = requireDriver(nextStage.format);
  await driver.generateSchedule?.({
    stageId: nextStage.id,
    seasonId: nextStage.seasonId,
    competitionId: "",
    config: (nextStage.formatConfig ?? {}) as Record<string, unknown>,
  });

  await writeAudit({
    seasonId: fromStage.seasonId,
    actorUserId,
    action: "stage.advance",
    target: fromStageId,
    after: { nextStageId: nextStage.id, advanced: advancers.length },
  });

  return { ok: true, nextStageId: nextStage.id, advanced: advancers.length };
}
