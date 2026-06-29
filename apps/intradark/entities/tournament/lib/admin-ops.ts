/**
 * P6 organizer operations: prizes, disputes, organizer delegation, and news
 * linking. All audited. Callers must be authorized (API routes gate first).
 */
import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  competitionOrganizers,
  competitionPrizes,
  matchDisputes,
  newsArticleCompetitions,
} from "@/server/db/schema";

import { writeAudit } from "./audit";

// ---- Prizes ----
export interface AddPrizeInput {
  seasonId: string;
  placementLow: number;
  placementHigh: number;
  prizeType: "cash" | "in_game_item" | "platform_points" | "physical" | "custom";
  amount?: number;
  currency?: string;
  description?: string;
}

export async function addPrize(input: AddPrizeInput, actorUserId: string | null) {
  const [row] = await db
    .insert(competitionPrizes)
    .values({
      seasonId: input.seasonId,
      placementLow: input.placementLow,
      placementHigh: input.placementHigh,
      prizeType: input.prizeType,
      amount: input.amount != null ? String(input.amount) : null,
      currency: input.currency ?? null,
      description: input.description ?? null,
    })
    .returning({ id: competitionPrizes.id });
  await writeAudit({
    seasonId: input.seasonId,
    actorUserId,
    action: "prize.add",
    target: row?.id ?? null,
    after: { placement: [input.placementLow, input.placementHigh], amount: input.amount },
  });
  return { ok: true as const, prizeId: row?.id };
}

export async function setPrizePaid(
  prizeId: string,
  recipientEntrantId: string | null,
  actorUserId: string | null,
) {
  await db
    .update(competitionPrizes)
    .set({
      payoutStatus: "paid",
      recipientEntrantId,
      paidAt: sql`now()`,
    })
    .where(eq(competitionPrizes.id, prizeId));
  await writeAudit({
    actorUserId,
    action: "prize.paid",
    target: prizeId,
    after: { recipientEntrantId },
  });
  return { ok: true as const };
}

// ---- Disputes ----
export async function raiseDispute(input: {
  matchId: string;
  raisedByEntrant?: string | null;
  raisedByUser?: string | null;
  type: string;
  description?: string;
  evidenceUrls?: string[];
  demoObjectPath?: string | null;
}) {
  const [row] = await db
    .insert(matchDisputes)
    .values({
      matchId: input.matchId,
      raisedByEntrant: input.raisedByEntrant ?? null,
      raisedByUser: input.raisedByUser ?? null,
      type: input.type,
      description: input.description ?? null,
      evidenceUrls: (input.evidenceUrls ?? []) as never,
      demoObjectPath: input.demoObjectPath ?? null,
      status: "open",
    })
    .returning({ id: matchDisputes.id });
  return { ok: true as const, disputeId: row?.id };
}

export async function resolveDispute(
  disputeId: string,
  status: "resolved" | "rejected" | "reviewing",
  resolution: string | null,
  resolvedByUser: string | null,
) {
  await db
    .update(matchDisputes)
    .set({
      status,
      resolution,
      resolvedBy: resolvedByUser,
      resolvedAt: status === "reviewing" ? null : sql`now()`,
    })
    .where(eq(matchDisputes.id, disputeId));
  await writeAudit({
    actorUserId: resolvedByUser,
    action: "dispute.resolve",
    target: disputeId,
    after: { status },
  });
  return { ok: true as const };
}

export async function listDisputes(matchId: string) {
  return db
    .select()
    .from(matchDisputes)
    .where(eq(matchDisputes.matchId, matchId))
    .orderBy(desc(matchDisputes.createdAt));
}

// ---- Organizer delegation ----
export async function addOrganizer(
  competitionId: string,
  userId: string,
  role: "owner" | "admin" | "moderator",
  actorUserId: string | null,
) {
  await db
    .insert(competitionOrganizers)
    .values({ competitionId, userId, role })
    .onConflictDoUpdate({
      target: [competitionOrganizers.competitionId, competitionOrganizers.userId],
      set: { role },
    });
  await writeAudit({
    competitionId,
    actorUserId,
    action: "organizer.add",
    target: userId,
    after: { role },
  });
  return { ok: true as const };
}

export async function removeOrganizer(
  competitionId: string,
  userId: string,
  actorUserId: string | null,
) {
  await db
    .delete(competitionOrganizers)
    .where(
      and(
        eq(competitionOrganizers.competitionId, competitionId),
        eq(competitionOrganizers.userId, userId),
      ),
    );
  await writeAudit({
    competitionId,
    actorUserId,
    action: "organizer.remove",
    target: userId,
  });
  return { ok: true as const };
}

// ---- News linking ----
export async function linkNewsArticle(
  articleId: string,
  seasonId: string,
  relationType: "announcement" | "preview" | "recap" | "result" | "general",
  actorUserId: string | null,
) {
  await db
    .insert(newsArticleCompetitions)
    .values({ articleId, seasonId, relationType })
    .onConflictDoUpdate({
      target: [newsArticleCompetitions.articleId, newsArticleCompetitions.seasonId],
      set: { relationType },
    });
  await writeAudit({
    seasonId,
    actorUserId,
    action: "news.link",
    target: articleId,
    after: { relationType },
  });
  return { ok: true as const };
}

export async function unlinkNewsArticle(articleId: string, seasonId: string) {
  await db
    .delete(newsArticleCompetitions)
    .where(
      and(
        eq(newsArticleCompetitions.articleId, articleId),
        eq(newsArticleCompetitions.seasonId, seasonId),
      ),
    );
  return { ok: true as const };
}
