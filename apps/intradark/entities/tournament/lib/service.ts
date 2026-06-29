/**
 * Tournament write operations. Organizer-gated callers (server actions / API
 * routes) invoke these after authorization; every sensitive change is audited.
 */
import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionEntrantMembers,
  competitionEntrants,
  competitionSeasons,
  competitionStages,
  competitions,
  players,
} from "@/server/db/schema";

import { writeAudit } from "./audit";
import { GAME_MODE_TEAM_SIZE, type GameMode } from "./constants";
import { requireDriver } from "./formats/registry";
import type {
  CreateCompetitionInput,
  RegisterEntrantInput,
  UpdateSeasonStatusInput,
} from "./schemas";

export interface CreatedCompetition {
  competitionId: string;
  seasonId: string;
  stageId: string;
  slug: string;
}

/** Create a competition + season 1 + an initial stage of the chosen format. */
export async function createCompetition(
  input: CreateCompetitionInput,
  actorUserId: string,
): Promise<CreatedCompetition> {
  const driver = requireDriver(input.format);
  const config = driver.configSchema.parse(input.stageConfig ?? {});

  const teamSize = GAME_MODE_TEAM_SIZE[input.gameMode as GameMode] ?? 1;
  const minRoster = input.season.minRoster ?? teamSize;
  const maxRoster = input.season.maxRoster ?? Math.max(teamSize, minRoster);

  return db.transaction(async (tx) => {
    const [comp] = await tx
      .insert(competitions)
      .values({
        slug: input.slug,
        name: input.name,
        gameMode: input.gameMode,
        format: input.format,
        entryType: input.entryType,
        recurrence: input.recurrence,
        description: input.description ?? null,
        branding: (input.branding ?? {}) as never,
        createdBy: actorUserId,
      })
      .returning({ id: competitions.id });
    if (!comp) throw new Error("Failed to create competition");

    const [season] = await tx
      .insert(competitionSeasons)
      .values({
        competitionId: comp.id,
        seasonNumber: 1,
        name: input.season.name ?? null,
        status: "draft",
        registrationOpensAt: input.season.registrationOpensAt ?? null,
        registrationClosesAt: input.season.registrationClosesAt ?? null,
        rosterLockAt: input.season.rosterLockAt ?? null,
        startAt: input.season.startAt ?? null,
        endAt: input.season.endAt ?? null,
        maxEntrants: input.season.maxEntrants ?? null,
        minRoster,
        maxRoster,
        checkInRequired: input.season.checkInRequired ?? false,
        checkInOpensAt: input.season.checkInOpensAt ?? null,
        eligibilityRules: (input.season.eligibilityRules ?? {}) as never,
        mapPool: (input.season.mapPool ?? []) as never,
        matchDefaults: (input.season.matchDefaults ?? {}) as never,
        entryFee: input.season.entryFee?.toString() ?? null,
        fundingSource: input.season.fundingSource ?? "internal",
        prizePool: input.season.prizePool?.toString() ?? null,
        prizeCurrency: input.season.prizeCurrency ?? "AUD",
      })
      .returning({ id: competitionSeasons.id });
    if (!season) throw new Error("Failed to create season");

    const [stage] = await tx
      .insert(competitionStages)
      .values({
        seasonId: season.id,
        sortOrder: 0,
        name: driver.label,
        format: input.format,
        formatConfig: config as never,
        advancementRule: {} as never,
        status: "pending",
      })
      .returning({ id: competitionStages.id });
    if (!stage) throw new Error("Failed to create stage");

    await writeAudit(
      {
        competitionId: comp.id,
        seasonId: season.id,
        actorUserId,
        action: "competition.create",
        target: input.slug,
        after: { name: input.name, format: input.format },
      },
      tx,
    );

    return {
      competitionId: comp.id,
      seasonId: season.id,
      stageId: stage.id,
      slug: input.slug,
    };
  });
}

export async function updateSeasonStatus(
  input: UpdateSeasonStatusInput,
  actorUserId: string,
): Promise<void> {
  const [before] = await db
    .select({ status: competitionSeasons.status, competitionId: competitionSeasons.competitionId })
    .from(competitionSeasons)
    .where(eq(competitionSeasons.id, input.seasonId))
    .limit(1);
  if (!before) throw new Error("Season not found");

  await db
    .update(competitionSeasons)
    .set({ status: input.status, updatedAt: sql`now()` })
    .where(eq(competitionSeasons.id, input.seasonId));

  await writeAudit({
    competitionId: before.competitionId,
    seasonId: input.seasonId,
    actorUserId,
    action: "season.status",
    before: { status: before.status },
    after: { status: input.status },
    reason: input.reason ?? null,
  });
}

/**
 * Register an entrant into a season with its roster snapshot. For ladders the
 * entrant is appended to the bottom of the ladder and the one-per-season rule is
 * relaxed (uniqueEnforced=false).
 */
export async function registerEntrant(
  input: RegisterEntrantInput,
  actorUserId: string | null,
): Promise<{ entrantId: string }> {
  const [season] = await db
    .select({
      id: competitionSeasons.id,
      competitionId: competitionSeasons.competitionId,
    })
    .from(competitionSeasons)
    .where(eq(competitionSeasons.id, input.seasonId))
    .limit(1);
  if (!season) throw new Error("Season not found");

  const [comp] = await db
    .select({ format: competitions.format })
    .from(competitions)
    .where(eq(competitions.id, season.competitionId))
    .limit(1);
  const isLadder = comp?.format === "ladder";

  return db.transaction(async (tx) => {
    // Ensure player rows exist (FK target) — harmless if already present.
    for (const m of input.members) {
      await tx
        .insert(players)
        .values({ steamid64: m.steamid64 })
        .onConflictDoNothing({ target: players.steamid64 });
    }

    let ladderRank: number | null = null;
    if (isLadder) {
      const maxRows = await tx
        .select({ maxRank: sql<number>`coalesce(max(${competitionEntrants.ladderRank}), 0)` })
        .from(competitionEntrants)
        .where(eq(competitionEntrants.seasonId, input.seasonId));
      ladderRank = Number(maxRows[0]?.maxRank ?? 0) + 1;
    }

    const [entrant] = await tx
      .insert(competitionEntrants)
      .values({
        seasonId: input.seasonId,
        teamId: input.teamId ?? null,
        displayName: input.displayName,
        avatar: input.avatar ?? null,
        ladderRank,
        status: "registered",
        createdBy: actorUserId,
      })
      .returning({ id: competitionEntrants.id });
    if (!entrant) throw new Error("Failed to register entrant");

    await tx.insert(competitionEntrantMembers).values(
      input.members.map((m) => ({
        entrantId: entrant.id,
        steamid64: m.steamid64,
        seasonId: input.seasonId,
        isCaptain: m.isCaptain ?? false,
        uniqueEnforced: !isLadder,
      })),
    );

    await writeAudit(
      {
        competitionId: season.competitionId,
        seasonId: input.seasonId,
        actorUserId,
        action: "entrant.register",
        target: entrant.id,
        after: { displayName: input.displayName, ladderRank },
      },
      tx,
    );

    return { entrantId: entrant.id };
  });
}

/** Snapshot-lock all entrant rosters for a season (plan §4). */
export async function lockRosters(
  seasonId: string,
  actorUserId: string,
): Promise<void> {
  await db
    .update(competitionEntrants)
    .set({ lockedAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(competitionEntrants.seasonId, seasonId),
        sql`${competitionEntrants.lockedAt} IS NULL`,
      ),
    );
  await writeAudit({ seasonId, actorUserId, action: "season.lock_rosters" });
}
