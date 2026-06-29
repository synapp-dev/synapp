import {
  and,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/server/db/drizzle";
import {
  players,
  playerProfileComments,
  playerProfileTrustVotes,
  steamProfiles,
  userProfiles,
} from "@/server/db/schema";

import { buildCommentTree } from "./build-comment-tree";
import {
  PLAYER_PROFILE_TOP_LEVEL_PAGE_SIZE,
  type ProfileTrustSignal,
} from "./constants";
import type { ProfileCommentFlat, ProfileCommentTreeNode } from "./build-comment-tree";

export type ProfileTrustCounts = {
  legit: number;
  suspicious: number;
};

export type ProfileCommentsPage = {
  trees: ProfileCommentTreeNode[];
  topLevelCount: number;
  nextCursor: { createdAt: string; id: string } | null;
};

function mapCommentRow(
  row: typeof playerProfileComments.$inferSelect,
  author: {
    username: string | null;
    avatar: string | null;
    displayName: string | null;
    countryFlag: string | null;
    steamid64: string | null;
  },
): ProfileCommentFlat {
  return {
    id: row.id,
    subjectSteamid64: row.subjectSteamid64,
    parentCommentId: row.parentCommentId,
    body: row.body,
    authorUserId: row.authorUserId,
    trustSignal: (row.trustSignal as ProfileTrustSignal | null) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorUsername: author.username,
    authorAvatar: author.avatar,
    authorDisplayName: author.displayName,
    authorCountryFlag: author.countryFlag,
    authorSteamid64: author.steamid64,
  };
}

async function fetchCommentsWithAuthors(
  commentIds: string[],
): Promise<ProfileCommentFlat[]> {
  if (commentIds.length === 0) return [];

  const rows = await db
    .select({
      comment: playerProfileComments,
      username: userProfiles.username,
      displayName: userProfiles.displayName,
      profileAvatar: userProfiles.avatarUrl,
      steamAvatar: steamProfiles.avatarfull,
      steamid64: userProfiles.steamProfileId,
      countryFlag: players.countryFlag,
    })
    .from(playerProfileComments)
    .leftJoin(
      userProfiles,
      eq(userProfiles.userId, playerProfileComments.authorUserId),
    )
    .leftJoin(
      steamProfiles,
      eq(steamProfiles.steamid64, userProfiles.steamProfileId),
    )
    .leftJoin(players, eq(players.steamid64, userProfiles.steamProfileId))
    .where(
      and(
        inArray(playerProfileComments.id, commentIds),
        isNull(playerProfileComments.deletedAt),
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
  subjectSteamid64: string,
  rootIds: string[],
): Promise<string[]> {
  const allIds = new Set<string>(rootIds);
  let frontier = [...rootIds];

  for (let depth = 0; depth < 3 && frontier.length > 0; depth += 1) {
    const children = await db
      .select({ id: playerProfileComments.id })
      .from(playerProfileComments)
      .where(
        and(
          eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
          inArray(playerProfileComments.parentCommentId, frontier),
          isNull(playerProfileComments.deletedAt),
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

export async function getPlayerProfileTrustCounts(
  subjectSteamid64: string,
): Promise<ProfileTrustCounts> {
  const rows = await db
    .select({
      signal: playerProfileTrustVotes.signal,
      total: count(),
    })
    .from(playerProfileTrustVotes)
    .where(eq(playerProfileTrustVotes.subjectSteamid64, subjectSteamid64))
    .groupBy(playerProfileTrustVotes.signal);

  let legit = 0;
  let suspicious = 0;
  for (const row of rows) {
    if (row.signal === "legit") legit = Number(row.total);
    if (row.signal === "suspicious") suspicious = Number(row.total);
  }
  return { legit, suspicious };
}

export async function countRecentCommentsForProfile(
  authorUserId: string,
  subjectSteamid64: string,
  sinceIso: string,
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(playerProfileComments)
    .where(
      and(
        eq(playerProfileComments.authorUserId, authorUserId),
        eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
        gt(playerProfileComments.createdAt, sinceIso),
        isNull(playerProfileComments.deletedAt),
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getExistingTrustVote(
  subjectSteamid64: string,
  voterUserId: string,
) {
  const rows = await db
    .select()
    .from(playerProfileTrustVotes)
    .where(
      and(
        eq(playerProfileTrustVotes.subjectSteamid64, subjectSteamid64),
        eq(playerProfileTrustVotes.voterUserId, voterUserId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listCommentsForSubject(
  subjectSteamid64: string,
  options?: {
    cursor?: { createdAt: string; id: string };
    pageSize?: number;
  },
): Promise<ProfileCommentsPage> {
  const pageSize = options?.pageSize ?? PLAYER_PROFILE_TOP_LEVEL_PAGE_SIZE;
  const cursor = options?.cursor;

  const topLevelWhere = and(
    eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
    isNull(playerProfileComments.parentCommentId),
    isNull(playerProfileComments.deletedAt),
    cursor
      ? or(
          lt(playerProfileComments.createdAt, cursor.createdAt),
          and(
            eq(playerProfileComments.createdAt, cursor.createdAt),
            lt(playerProfileComments.id, cursor.id),
          ),
        )
      : undefined,
  );

  const topLevelRows = await db
    .select()
    .from(playerProfileComments)
    .where(topLevelWhere)
    .orderBy(
      desc(playerProfileComments.createdAt),
      desc(playerProfileComments.id),
    )
    .limit(pageSize + 1);

  const hasMore = topLevelRows.length > pageSize;
  const pageRoots = hasMore ? topLevelRows.slice(0, pageSize) : topLevelRows;
  const rootIds = pageRoots.map((r) => r.id);

  const allIds = await collectDescendantIds(subjectSteamid64, rootIds);
  const flat = await fetchCommentsWithAuthors(allIds);

  const flatById = new Map(flat.map((c) => [c.id, c]));
  const rootsSorted = pageRoots
    .map((r) => flatById.get(r.id))
    .filter((c): c is ProfileCommentFlat => c != null);

  const replyRows = flat.filter((c) => c.parentCommentId != null);
  const trees = buildCommentTree([...rootsSorted, ...replyRows]);

  const [countRow] = await db
    .select({ total: count() })
    .from(playerProfileComments)
    .where(
      and(
        eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
        isNull(playerProfileComments.parentCommentId),
        isNull(playerProfileComments.deletedAt),
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

export async function listAllCommentsForSubject(
  subjectSteamid64: string,
): Promise<ProfileCommentFlat[]> {
  const rows = await db
    .select({ id: playerProfileComments.id })
    .from(playerProfileComments)
    .where(
      and(
        eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
        isNull(playerProfileComments.deletedAt),
      ),
    );
  return fetchCommentsWithAuthors(rows.map((r) => r.id));
}

export async function getCommentById(commentId: string) {
  const rows = await db
    .select()
    .from(playerProfileComments)
    .where(
      and(
        eq(playerProfileComments.id, commentId),
        isNull(playerProfileComments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** All non-deleted comments for depth checks on a subject. */
export async function listCommentParentRows(subjectSteamid64: string) {
  return db
    .select({
      id: playerProfileComments.id,
      parentCommentId: playerProfileComments.parentCommentId,
    })
    .from(playerProfileComments)
    .where(
      and(
        eq(playerProfileComments.subjectSteamid64, subjectSteamid64),
        isNull(playerProfileComments.deletedAt),
      ),
    );
}

export { sql };
