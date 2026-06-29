/**
 * Ladder challenge lifecycle (plan §3.2). Create (±range gate) → mandatory accept
 * (creates a match through the shared engine) → forfeit (swap by default loss).
 * The created match flows through provisioning → MatchZy → finalizeMatch, which
 * runs the ladder swap. Forfeits apply the swap directly (no game played).
 */
import "server-only";

import { and, eq, gt, inArray, or, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionChallenges,
  competitionEntrantMembers,
  competitionEntrants,
  competitionStages,
  matchPlayers,
  matches,
  playerRatings,
} from "@/server/db/schema";
import { DEFAULT_RATING } from "@/entities/match-queue/lib/leagues";

import { writeAudit } from "./audit";
import { onCompetitionMatchCompleted } from "./finalize-hook";
import { requireDriver } from "./formats/registry";
import { ladderConfigSchema } from "./formats/ladder";
import { notifyEntrantMembers } from "./notify";

export interface ChallengeResult {
  ok: boolean;
  challengeId?: string;
  error?: string;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

async function loadLadderStage(stageId: string) {
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

/** Issue a challenge. Enforces ±range (via driver) and rematch cooldown. */
export async function createChallenge(
  stageId: string,
  challengerEntrantId: string,
  challengedEntrantId: string,
  actorUserId: string | null,
): Promise<ChallengeResult> {
  const stage = await loadLadderStage(stageId);
  if (!stage) return { ok: false, error: "Stage not found." };
  if (stage.format !== "ladder") {
    return { ok: false, error: "Challenges are only valid on a ladder." };
  }

  const driver = requireDriver(stage.format);
  const gate = await driver.canCreateMatch?.({
    stage: {
      stageId: stage.id,
      seasonId: stage.seasonId,
      competitionId: "",
      config: (stage.formatConfig ?? {}) as Record<string, unknown>,
    },
    challengerEntrantId,
    challengedEntrantId,
  });
  if (gate && !gate.allowed) return { ok: false, error: gate.reason };

  const config = ladderConfigSchema.parse(stage.formatConfig ?? {});

  // Rematch cooldown: no new challenge between the same pair within the window.
  const cutoff = sql`now() - (${config.rematchCooldownHours} || ' hours')::interval`;
  const [recent] = await db
    .select({ id: competitionChallenges.id })
    .from(competitionChallenges)
    .where(
      and(
        eq(competitionChallenges.stageId, stageId),
        gt(competitionChallenges.createdAt, cutoff),
        or(
          and(
            eq(competitionChallenges.challengerEntrantId, challengerEntrantId),
            eq(competitionChallenges.challengedEntrantId, challengedEntrantId),
          ),
          and(
            eq(competitionChallenges.challengerEntrantId, challengedEntrantId),
            eq(competitionChallenges.challengedEntrantId, challengerEntrantId),
          ),
        ),
      ),
    )
    .limit(1);
  if (recent) {
    return { ok: false, error: "You've recently played this team — wait for the cooldown." };
  }

  const ranks = await db
    .select({ id: competitionEntrants.id, rank: competitionEntrants.ladderRank })
    .from(competitionEntrants)
    .where(inArray(competitionEntrants.id, [challengerEntrantId, challengedEntrantId]));
  const rankOf = (id: string) => ranks.find((r) => r.id === id)?.rank ?? null;

  try {
    const [row] = await db
      .insert(competitionChallenges)
      .values({
        stageId,
        challengerEntrantId,
        challengedEntrantId,
        challengerRank: rankOf(challengerEntrantId),
        challengedRank: rankOf(challengedEntrantId),
        status: "pending",
        proposedAt: sql`now()`,
        expiresAt: sql`now() + (${config.challengeExpiryHours} || ' hours')::interval`,
      })
      .returning({ id: competitionChallenges.id });
    if (!row) return { ok: false, error: "Failed to create challenge." };

    await writeAudit({
      seasonId: stage.seasonId,
      actorUserId,
      action: "ladder.challenge",
      target: row.id,
      after: { challengerEntrantId, challengedEntrantId },
    });

    // Notify the challenged team — they must accept (mandatory) or forfeit.
    await notifyEntrantMembers({
      entrantId: challengedEntrantId,
      kind: "ladder_challenge_received",
      dedupScope: `challenge:${row.id}`,
      payload: { challengeId: row.id, expiresInHours: config.challengeExpiryHours },
    }).catch(() => {});

    return { ok: true, challengeId: row.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        error: "One of the teams already has an active challenge.",
      };
    }
    throw err;
  }
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

/**
 * Accept a challenge → create the match (home = challenger, away = challenged)
 * with both rosters, hand it to the engine (status `configuring`). The ladder
 * swap happens later when finalizeMatch runs.
 */
export async function acceptChallenge(
  challengeId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; matchId?: string; error?: string }> {
  const [ch] = await db
    .select()
    .from(competitionChallenges)
    .where(eq(competitionChallenges.id, challengeId))
    .limit(1);
  if (!ch) return { ok: false, error: "Challenge not found." };
  if (ch.status !== "pending") return { ok: false, error: "Challenge is no longer pending." };

  const stage = await loadLadderStage(ch.stageId);
  if (!stage) return { ok: false, error: "Stage not found." };

  const [home, away] = await Promise.all([
    rosterEloPlayers(ch.challengerEntrantId),
    rosterEloPlayers(ch.challengedEntrantId),
  ]);

  const matchId = await db.transaction(async (tx) => {
    const [m] = await tx
      .insert(matches)
      .values({
        league: "ladder",
        status: "configuring",
        matchSource: "ladder_challenge",
        seasonId: stage.seasonId,
        stageId: stage.id,
        homeEntrantId: ch.challengerEntrantId,
        awayEntrantId: ch.challengedEntrantId,
      })
      .returning({ id: matches.id });
    if (!m) throw new Error("Failed to create match");

    const rows = [
      ...home.map((p) => ({ matchId: m.id, steamid64: p.steamid64, team: 1, ratingAtQueue: p.rating })),
      ...away.map((p) => ({ matchId: m.id, steamid64: p.steamid64, team: 2, ratingAtQueue: p.rating })),
    ];
    if (rows.length) {
      await tx.insert(matchPlayers).values(rows).onConflictDoNothing();
    }

    await tx
      .update(competitionChallenges)
      .set({ status: "accepted", matchId: m.id, resolvedAt: sql`now()`, updatedAt: sql`now()` })
      .where(eq(competitionChallenges.id, challengeId));

    return m.id;
  });

  await writeAudit({
    seasonId: stage.seasonId,
    actorUserId,
    action: "ladder.accept",
    target: challengeId,
    after: { matchId },
  });

  // Notify the challenger their challenge was accepted (match is on).
  await notifyEntrantMembers({
    entrantId: ch.challengerEntrantId,
    kind: "ladder_challenge_accepted",
    dedupScope: `accept:${challengeId}`,
    payload: { challengeId, matchId },
  }).catch(() => {});

  return { ok: true, matchId };
}

/**
 * Decline (or auto-expire) → forfeit. The challenger wins by default and takes
 * the position; no game is played, so no Elo moves — just the ladder swap.
 */
export async function forfeitChallenge(
  challengeId: string,
  actorUserId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const [ch] = await db
    .select()
    .from(competitionChallenges)
    .where(eq(competitionChallenges.id, challengeId))
    .limit(1);
  if (!ch) return { ok: false, error: "Challenge not found." };
  if (ch.status !== "pending") return { ok: false, error: "Challenge is no longer pending." };

  const stage = await loadLadderStage(ch.stageId);
  if (!stage) return { ok: false, error: "Stage not found." };

  await db
    .update(competitionChallenges)
    .set({ status: "forfeit", resolvedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(competitionChallenges.id, challengeId));

  // Challenger (home) wins by forfeit → apply ladder swap.
  await onCompetitionMatchCompleted({
    matchId: challengeId, // no match row; id is informational for the ladder driver
    seasonId: stage.seasonId,
    stageId: stage.id,
    homeEntrantId: ch.challengerEntrantId,
    awayEntrantId: ch.challengedEntrantId,
    winnerTeam: 1, // challenger (home) wins by forfeit
    scoreHome: 0,
    scoreAway: 0,
  });

  await writeAudit({
    seasonId: stage.seasonId,
    actorUserId,
    action: "ladder.forfeit",
    target: challengeId,
    after: { winner: ch.challengerEntrantId },
  });
  return { ok: true };
}

/** Sweep expired pending challenges → forfeit (mandatory-accept enforcement). */
export async function expireDueChallenges(): Promise<number> {
  const due = await db
    .select({ id: competitionChallenges.id })
    .from(competitionChallenges)
    .where(
      and(
        eq(competitionChallenges.status, "pending"),
        sql`${competitionChallenges.expiresAt} < now()`,
      ),
    );
  for (const c of due) {
    await forfeitChallenge(c.id, null);
  }
  return due.length;
}
