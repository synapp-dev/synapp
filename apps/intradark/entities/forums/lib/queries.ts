import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  forumCategories,
  forumReplies,
  forumTags,
  forumThreads,
  forumThreadTags,
  userProfiles,
} from "@/server/db/schema";

export async function listForumCategories() {
  return db
    .select()
    .from(forumCategories)
    .orderBy(asc(forumCategories.sortOrder), asc(forumCategories.slug));
}

export async function getForumCategoryBySlug(slug: string) {
  const rows = await db
    .select()
    .from(forumCategories)
    .where(eq(forumCategories.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getForumCategoryById(id: string) {
  const rows = await db
    .select()
    .from(forumCategories)
    .where(eq(forumCategories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listForumThreadsForCategory(categoryId: string, limit = 50) {
  const replyCountSql = sql<number>`(
    select count(*)::int from ${forumReplies} fr
    where fr.thread_id = ${forumThreads.id} and fr.deleted_at is null
  )`.mapWith(Number);

  return db
    .select({
      id: forumThreads.id,
      slug: forumThreads.slug,
      title: forumThreads.title,
      authorUserId: forumThreads.authorUserId,
      createdAt: forumThreads.createdAt,
      updatedAt: forumThreads.updatedAt,
      replyCount: replyCountSql,
      authorDisplayName: userProfiles.displayName,
      authorUsername: userProfiles.username,
    })
    .from(forumThreads)
    .leftJoin(userProfiles, eq(userProfiles.userId, forumThreads.authorUserId))
    .where(
      and(
        eq(forumThreads.categoryId, categoryId),
        isNull(forumThreads.deletedAt),
      ),
    )
    .orderBy(desc(forumThreads.updatedAt))
    .limit(limit);
}

export async function getForumThreadBySlugs(
  categorySlug: string,
  threadSlug: string,
) {
  const cat = await getForumCategoryBySlug(categorySlug);
  if (!cat) return { category: null as null, thread: null as null };

  const rows = await db
    .select({
      thread: forumThreads,
      authorDisplayName: userProfiles.displayName,
      authorUsername: userProfiles.username,
    })
    .from(forumThreads)
    .innerJoin(forumCategories, eq(forumCategories.id, forumThreads.categoryId))
    .leftJoin(userProfiles, eq(userProfiles.userId, forumThreads.authorUserId))
    .where(
      and(
        eq(forumCategories.slug, categorySlug),
        eq(forumThreads.slug, threadSlug),
        isNull(forumThreads.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { category: cat, thread: null as null };

  return {
    category: cat,
    thread: {
      ...row.thread,
      authorDisplayName: row.authorDisplayName,
      authorUsername: row.authorUsername,
    },
  };
}

export async function listForumRepliesForThread(threadId: string) {
  return db
    .select({
      id: forumReplies.id,
      threadId: forumReplies.threadId,
      parentReplyId: forumReplies.parentReplyId,
      body: forumReplies.body,
      authorUserId: forumReplies.authorUserId,
      createdAt: forumReplies.createdAt,
      authorDisplayName: userProfiles.displayName,
      authorUsername: userProfiles.username,
    })
    .from(forumReplies)
    .leftJoin(userProfiles, eq(userProfiles.userId, forumReplies.authorUserId))
    .where(
      and(eq(forumReplies.threadId, threadId), isNull(forumReplies.deletedAt)),
    )
    .orderBy(forumReplies.createdAt);
}

export async function listForumTags() {
  return db.select().from(forumTags).orderBy(forumTags.slug);
}

export async function getForumTagIdsBySlugs(slugs: string[]) {
  if (slugs.length === 0) return [] as { id: string; slug: string }[];
  return db
    .select({ id: forumTags.id, slug: forumTags.slug })
    .from(forumTags)
    .where(inArray(forumTags.slug, slugs));
}

export async function isThreadSlugTakenInCategory(
  categoryId: string,
  slug: string,
) {
  const rows = await db
    .select({ c: count() })
    .from(forumThreads)
    .where(
      and(eq(forumThreads.categoryId, categoryId), eq(forumThreads.slug, slug)),
    );
  return Number(rows[0]?.c ?? 0) > 0;
}
