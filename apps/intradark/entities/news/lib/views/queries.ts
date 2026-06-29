import { eq, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { newsArticles, newsArticleViews } from "@/server/db/schema";

export type NewsViewBreakdown = {
  /** Raw total loads (refreshes included). */
  total: number;
  /** Distinct viewers (members + anonymous). */
  unique: number;
  /** Distinct signed-in viewers. */
  members: number;
  /** Distinct logged-out viewers. */
  anonymous: number;
};

/** Total + unique/members/anonymous breakdown for one article. */
export async function getNewsViewBreakdown(
  articleId: string,
): Promise<NewsViewBreakdown> {
  const [article, agg] = await Promise.all([
    db
      .select({ total: newsArticles.viewCount })
      .from(newsArticles)
      .where(eq(newsArticles.id, articleId))
      .limit(1),
    db
      .select({
        unique: sql<number>`count(*)::int`,
        members: sql<number>`count(*) filter (where ${newsArticleViews.userId} is not null)::int`,
      })
      .from(newsArticleViews)
      .where(eq(newsArticleViews.articleId, articleId)),
  ]);

  const total = Number(article[0]?.total ?? 0);
  const unique = Number(agg[0]?.unique ?? 0);
  const members = Number(agg[0]?.members ?? 0);
  return { total, unique, members, anonymous: unique - members };
}
