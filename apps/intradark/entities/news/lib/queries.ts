import { and, asc, desc, eq, inArray, isNotNull, ne } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  newsArticleTags,
  newsArticles,
  newsTags,
  players,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

export type ArticleTag = { slug: string; label: string };

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
    .select({
      article: newsArticles,
      authorDisplayName: userProfiles.displayName,
      authorUsername: userProfiles.username,
      authorAvatarUrl: userProfiles.avatarUrl,
      authorBio: userProfiles.bio,
      authorSteamAvatar: steamProfiles.avatarfull,
      authorSteamid64: userProfiles.steamProfileId,
      authorCountryFlag: players.countryFlag,
    })
    .from(newsArticles)
    .leftJoin(userProfiles, eq(userProfiles.userId, newsArticles.authorUserId))
    .leftJoin(
      steamProfiles,
      eq(steamProfiles.steamid64, userProfiles.steamProfileId),
    )
    .leftJoin(players, eq(players.steamid64, userProfiles.steamProfileId))
    .where(
      and(
        eq(newsArticles.slug, slug),
        eq(newsArticles.status, "published"),
        isNotNull(newsArticles.publishedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    ...row.article,
    authorDisplayName: row.authorDisplayName,
    authorUsername: row.authorUsername,
    authorAvatarUrl: row.authorSteamAvatar ?? row.authorAvatarUrl,
    authorBio: row.authorBio,
    authorSteamid64: row.authorSteamid64,
    authorCountryFlag: row.authorCountryFlag,
  };
}

export async function listNewsTags(): Promise<ArticleTag[]> {
  return db
    .select({ slug: newsTags.slug, label: newsTags.label })
    .from(newsTags)
    .orderBy(asc(newsTags.label));
}

/** Map of articleId -> its tags, for a set of articles. */
export async function getTagsForArticleIds(
  ids: string[],
): Promise<Map<string, ArticleTag[]>> {
  const map = new Map<string, ArticleTag[]>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({
      articleId: newsArticleTags.articleId,
      slug: newsTags.slug,
      label: newsTags.label,
    })
    .from(newsArticleTags)
    .innerJoin(newsTags, eq(newsTags.id, newsArticleTags.tagId))
    .where(inArray(newsArticleTags.articleId, ids))
    .orderBy(asc(newsTags.label));
  for (const r of rows) {
    const arr = map.get(r.articleId) ?? [];
    arr.push({ slug: r.slug, label: r.label });
    map.set(r.articleId, arr);
  }
  return map;
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
