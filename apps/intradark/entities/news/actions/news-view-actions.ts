"use server";

import { eq, sql } from "drizzle-orm";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { db } from "@/server/db/drizzle";
import { newsArticles, newsArticleViews } from "@/server/db/schema";

import { getOrCreateAnonId } from "../lib/views/anon-id";
import { getNewsViewBreakdown, type NewsViewBreakdown } from "../lib/views/queries";

/**
 * Record one news view: bump the raw total on every call, and upsert the unique
 * viewer ledger row (no-op if this member/anon already viewed the article).
 * Fired once on mount from the client; returns the fresh breakdown so the
 * headline + tooltip update live. Best-effort — never throws to the caller.
 */
export async function recordNewsArticleViewAction(
  articleId: string,
): Promise<NewsViewBreakdown | null> {
  try {
    const userId = await getSessionUserId();
    const viewerKey = userId ? `u:${userId}` : `a:${await getOrCreateAnonId()}`;
    const anonId = userId ? null : viewerKey.slice(2);

    await db
      .update(newsArticles)
      .set({ viewCount: sql`${newsArticles.viewCount} + 1` })
      .where(eq(newsArticles.id, articleId));

    await db
      .insert(newsArticleViews)
      .values({ articleId, userId: userId ?? null, anonId, viewerKey })
      .onConflictDoNothing({
        target: [newsArticleViews.articleId, newsArticleViews.viewerKey],
      });

    return await getNewsViewBreakdown(articleId);
  } catch (err) {
    console.error("[news-views] recordNewsArticleViewAction", err);
    return null;
  }
}
