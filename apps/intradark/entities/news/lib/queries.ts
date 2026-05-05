import { and, desc, eq, isNotNull, ne } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import { newsArticles } from "@/server/db/schema";

export async function listPublishedNewsArticles() {
  return db
    .select()
    .from(newsArticles)
    .where(
      and(
        eq(newsArticles.status, "published"),
        isNotNull(newsArticles.publishedAt),
      ),
    )
    .orderBy(desc(newsArticles.publishedAt));
}

export async function getPublishedArticleBySlug(slug: string) {
  const rows = await db
    .select()
    .from(newsArticles)
    .where(
      and(
        eq(newsArticles.slug, slug),
        eq(newsArticles.status, "published"),
        isNotNull(newsArticles.publishedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listAllNewsArticlesForAdmin() {
  return db
    .select()
    .from(newsArticles)
    .orderBy(desc(newsArticles.updatedAt));
}

export async function getArticleByIdForAdmin(id: string) {
  const rows = await db
    .select()
    .from(newsArticles)
    .where(eq(newsArticles.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** True if `slug` is taken by a row other than `excludeId` (if provided). */
export async function isNewsSlugTaken(slug: string, excludeId?: string) {
  const row = await db
    .select({ id: newsArticles.id })
    .from(newsArticles)
    .where(
      excludeId
        ? and(eq(newsArticles.slug, slug), ne(newsArticles.id, excludeId))
        : eq(newsArticles.slug, slug),
    )
    .limit(1);
  return row.length > 0;
}
