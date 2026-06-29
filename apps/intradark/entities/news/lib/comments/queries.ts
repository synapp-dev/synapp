import { and, count, desc, eq, inArray, isNull, lt, or } from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  newsComments,
  players,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

import { buildNewsCommentTree } from "./build-comment-tree";
import { NEWS_COMMENT_TOP_LEVEL_PAGE_SIZE } from "./constants";
import type {
  NewsCommentFlat,
  NewsCommentTreeNode,
} from "./build-comment-tree";

export type NewsCommentsPage = {
  trees: NewsCommentTreeNode[];
  topLevelCount: number;
  nextCursor: { createdAt: string; id: string } | null;
};

function mapCommentRow(
  row: typeof newsComments.$inferSelect,
  author: {
    username: string | null;
    avatar: string | null;
    displayName: string | null;
    countryFlag: string | null;
    steamid64: string | null;
  },
): NewsCommentFlat {
  return {
    id: row.id,
    articleId: row.articleId,
    parentCommentId: row.parentCommentId,
    body: row.body,
    authorUserId: row.authorUserId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    authorAvatar: author.avatar,
    authorCountryFlag: author.countryFlag,
    authorSteamid64: author.steamid64,
  };
}

async function fetchCommentsWithAuthors(
  commentIds: string[],
): Promise<NewsCommentFlat[]> {
  if (commentIds.length === 0) return [];

  const rows = await db
    .select({
      comment: newsComments,
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      profileAvatar: userProfiles.avatarUrl,
      steamAvatar: steamProfiles.avatarfull,
      steamid64: userProfiles.steamProfileId,
      countryFlag: players.countryFlag,
    })
    .from(newsComments)
    .leftJoin(userProfiles, eq(userProfiles.userId, newsComments.authorUserId))
    .leftJoin(
      steamProfiles,
      eq(steamProfiles.steamid64, userProfiles.steamProfileId),
    )
    .leftJoin(players, eq(players.steamid64, userProfiles.steamProfileId))
    .where(
      and(
        inArray(newsComments.id, commentIds),
        isNull(newsComments.deletedAt),
      ),
    );

  return rows.map((r) =>
    mapCommentRow(r.comment, {
      username: r.username,
      avatar: r.steamAvatar ?? r.profileAvatar,
      displayName: r.displayName,
      countryFlag: r.countryFlag,
      steamid64: r.steamid64,
    }),
  );
}

async function collectDescendantIds(
  articleId: string,
  rootIds: string[],
): Promise<string[]> {
  const allIds = new Set<string>(rootIds);
  let frontier = [...rootIds];

  for (let depth = 0; depth < 3 && frontier.length > 0; depth += 1) {
    const children = await db
      .select({ id: newsComments.id })
      .from(newsComments)
      .where(
        and(
          eq(newsComments.articleId, articleId),
          inArray(newsComments.parentCommentId, frontier),
          isNull(newsComments.deletedAt),
        ),
      );
    frontier = [];
    for (const c of children) {
      if (!allIds.has(c.id)) {
        allIds.add(c.id);
        frontier.push(c.id);
      }
    }
  }

  return [...allIds];
}

export async function listNewsCommentsForArticle(
  articleId: string,
  options?: {
    cursor?: { createdAt: string; id: string };
    pageSize?: number;
  },
): Promise<NewsCommentsPage> {
  const pageSize = options?.pageSize ?? NEWS_COMMENT_TOP_LEVEL_PAGE_SIZE;
  const cursor = options?.cursor;

  const topLevelWhere = and(
    eq(newsComments.articleId, articleId),
    isNull(newsComments.parentCommentId),
    isNull(newsComments.deletedAt),
    cursor
      ? or(
          lt(newsComments.createdAt, cursor.createdAt),
          and(
            eq(newsComments.createdAt, cursor.createdAt),
            lt(newsComments.id, cursor.id),
          ),
        )
      : undefined,
  );

  const topLevelRows = await db
    .select()
    .from(newsComments)
    .where(topLevelWhere)
    .orderBy(desc(newsComments.createdAt), desc(newsComments.id))
    .limit(pageSize + 1);

  const hasMore = topLevelRows.length > pageSize;
  const pageRoots = hasMore ? topLevelRows.slice(0, pageSize) : topLevelRows;
  const rootIds = pageRoots.map((r) => r.id);

  const allIds = await collectDescendantIds(articleId, rootIds);
  const flat = await fetchCommentsWithAuthors(allIds);

  const flatById = new Map(flat.map((c) => [c.id, c]));
  const rootsSorted = pageRoots
    .map((r) => flatById.get(r.id))
    .filter((c): c is NewsCommentFlat => c != null);

  const replyRows = flat.filter((c) => c.parentCommentId != null);
  const trees = buildNewsCommentTree([...rootsSorted, ...replyRows]);

  const [countRow] = await db
    .select({ total: count() })
    .from(newsComments)
    .where(
      and(
        eq(newsComments.articleId, articleId),
        isNull(newsComments.parentCommentId),
        isNull(newsComments.deletedAt),
      ),
    );

  const lastRoot = pageRoots[pageRoots.length - 1];
  const nextCursor =
    hasMore && lastRoot
      ? { createdAt: lastRoot.createdAt, id: lastRoot.id }
      : null;

  return {
    trees,
    topLevelCount: Number(countRow?.total ?? 0),
    nextCursor,
  };
}

export async function getNewsCommentById(commentId: string) {
  const rows = await db
    .select()
    .from(newsComments)
    .where(
      and(eq(newsComments.id, commentId), isNull(newsComments.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** All non-deleted comments for depth checks on an article. */
export async function listNewsCommentParentRows(articleId: string) {
  return db
    .select({
      id: newsComments.id,
      parentCommentId: newsComments.parentCommentId,
    })
    .from(newsComments)
    .where(
      and(
        eq(newsComments.articleId, articleId),
        isNull(newsComments.deletedAt),
      ),
    );
}
