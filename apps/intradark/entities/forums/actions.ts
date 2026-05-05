"use server";

import { track } from "@vercel/analytics/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { db } from "@/server/db/drizzle";
import {
  forumReplies,
  forumThreads,
  forumThreadTags,
} from "@/server/db/schema";

import type { ForumActionResult } from "./lib/action-types";
import {
  appendSlugSuffix,
  isValidThreadSlug,
  slugifyThreadTitle,
} from "./lib/thread-slug";
import {
  createForumReplySchema,
  createForumThreadSchema,
  deleteForumReplySchema,
  deleteForumThreadSchema,
} from "./lib/schemas";
import {
  depthAfterNewChild,
  exceedsMaxReplyDepth,
  type ReplyParentRow,
} from "./lib/reply-depth";
import {
  getForumCategoryById,
  getForumCategoryBySlug,
  getForumTagIdsBySlugs,
  isThreadSlugTakenInCategory,
  listForumRepliesForThread,
} from "./lib/queries";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function formatZodError(err: {
  flatten: () => { fieldErrors: Record<string, string[]> };
}): string {
  const flat = err.flatten();
  const first = Object.values(flat.fieldErrors).find((a) => a?.length)?.[0];
  return first ?? "Invalid input.";
}

async function allocateThreadSlug(
  categoryId: string,
  title: string,
): Promise<string> {
  const base = slugifyThreadTitle(title);
  let candidate = base;
  let n = 2;
  while (!isValidThreadSlug(candidate)) {
    candidate = appendSlugSuffix(base, n);
    n += 1;
  }
  for (let i = 0; i < 200; i++) {
    const taken = await isThreadSlugTakenInCategory(categoryId, candidate);
    if (!taken) return candidate;
    candidate = appendSlugSuffix(base, n);
    n += 1;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createForumThreadAction(
  input: unknown,
): Promise<
  ForumActionResult<{ categorySlug: string; threadSlug: string }>
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to post." };
  }

  const parsed = createForumThreadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodError(parsed.error),
    };
  }

  const { categorySlug, title, body, tagSlugs } = parsed.data;
  const category = await getForumCategoryBySlug(categorySlug);
  if (!category) {
    return {
      ok: false,
      code: "CATEGORY_NOT_FOUND",
      message: "Category not found.",
    };
  }

  const uniqueTags = [...new Set(tagSlugs)];
  const tagRows = await getForumTagIdsBySlugs(uniqueTags);
  if (tagRows.length !== uniqueTags.length) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "One or more tags are invalid.",
    };
  }

  const threadSlug = await allocateThreadSlug(category.id, title);
  const now = new Date().toISOString();

  try {
    const result = await db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(forumThreads)
        .values({
          categoryId: category.id,
          slug: threadSlug,
          title,
          body,
          authorUserId: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: forumThreads.id, slug: forumThreads.slug });

      if (!thread) {
        throw new Error("insert_failed");
      }

      if (tagRows.length > 0) {
        await tx.insert(forumThreadTags).values(
          tagRows.map((t) => ({ threadId: thread.id, tagId: t.id })),
        );
      }

      return thread;
    });

    revalidatePath("/forums");
    revalidatePath(`/forums/${categorySlug}`);
    revalidatePath(`/forums/${categorySlug}/${result.slug}`);

    try {
      const h = await headers();
      await track(
        "forum_thread_created",
        {
          category_slug: categorySlug,
          thread_id: result.id,
          tag_count: uniqueTags.length,
        },
        { request: { headers: h } },
      );
    } catch (e) {
      console.warn("[forums] analytics track failed", e);
    }

    return {
      ok: true,
      data: { categorySlug, threadSlug: result.slug },
    };
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        ok: false,
        code: "THREAD_SLUG_TAKEN",
        message:
          "Could not allocate a unique URL slug. Try a different title.",
      };
    }
    console.error("[forums] createForumThreadAction", err);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function createForumReplyAction(
  input: unknown,
): Promise<ForumActionResult<{ replyId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to reply." };
  }

  const parsed = createForumReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodError(parsed.error),
    };
  }

  const { threadId, body } = parsed.data;
  const parentReplyId = parsed.data.parentReplyId ?? null;

  const threadRows = await db
    .select()
    .from(forumThreads)
    .where(and(eq(forumThreads.id, threadId), isNull(forumThreads.deletedAt)))
    .limit(1);
  const thread = threadRows[0];
  if (!thread) {
    return {
      ok: false,
      code: "THREAD_NOT_FOUND",
      message: "Thread not found.",
    };
  }

  if (parentReplyId) {
    const parentRows = await db
      .select()
      .from(forumReplies)
      .where(
        and(
          eq(forumReplies.id, parentReplyId),
          eq(forumReplies.threadId, threadId),
          isNull(forumReplies.deletedAt),
        ),
      )
      .limit(1);
    if (!parentRows[0]) {
      return {
        ok: false,
        code: "PARENT_REPLY_INVALID",
        message: "That reply is gone or not in this thread.",
      };
    }
  }

  const existing = await listForumRepliesForThread(threadId);
  const byId = new Map<string, ReplyParentRow>();
  for (const r of existing) {
    byId.set(r.id, { id: r.id, parentReplyId: r.parentReplyId });
  }

  const newDepth = depthAfterNewChild(parentReplyId, byId);
  if (newDepth < 0) {
    return {
      ok: false,
      code: "PARENT_REPLY_INVALID",
      message: "Invalid parent reply.",
    };
  }
  if (exceedsMaxReplyDepth(newDepth)) {
    return {
      ok: false,
      code: "REPLY_DEPTH_EXCEEDED",
      message: "Max reply depth reached. Reply higher in the thread.",
    };
  }

  const now = new Date().toISOString();
  try {
    const [row] = await db
      .insert(forumReplies)
      .values({
        threadId,
        parentReplyId,
        body,
        authorUserId: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: forumReplies.id });

    if (!row) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save reply.",
      };
    }

    await db
      .update(forumThreads)
      .set({ updatedAt: now })
      .where(eq(forumThreads.id, threadId));

    const category = await getForumCategoryById(thread.categoryId);

    revalidatePath("/forums");
    if (category) {
      revalidatePath(`/forums/${category.slug}`);
      revalidatePath(`/forums/${category.slug}/${thread.slug}`);
    }

    try {
      const h = await headers();
      const depthBucket =
        newDepth <= 2 ? "0-2" : newDepth <= 6 ? "3-6" : "7+";
      await track(
        "forum_reply_created",
        {
          thread_id: threadId,
          depth_bucket: depthBucket,
          has_parent: Boolean(parentReplyId),
        },
        { request: { headers: h } },
      );
    } catch (e) {
      console.warn("[forums] analytics track failed", e);
    }

    return { ok: true, data: { replyId: row.id } };
  } catch (err) {
    console.error("[forums] createForumReplyAction", err);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function softDeleteForumThreadAction(
  input: unknown,
): Promise<ForumActionResult<undefined>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required." };
  }

  const parsed = deleteForumThreadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodError(parsed.error),
    };
  }

  const { threadId } = parsed.data;
  const rows = await db
    .select()
    .from(forumThreads)
    .where(
      and(
        eq(forumThreads.id, threadId),
        isNull(forumThreads.deletedAt),
        eq(forumThreads.authorUserId, userId),
      ),
    )
    .limit(1);
  const thread = rows[0];
  if (!thread) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t remove this thread.",
    };
  }

  const category = await getForumCategoryById(thread.categoryId);
  const now = new Date().toISOString();

  await db
    .update(forumThreads)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(forumThreads.id, threadId));

  revalidatePath("/forums");
  if (category) {
    revalidatePath(`/forums/${category.slug}`);
    revalidatePath(`/forums/${category.slug}/${thread.slug}`);
  }

  return { ok: true, data: undefined };
}

export async function softDeleteForumReplyAction(
  input: unknown,
): Promise<ForumActionResult<undefined>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required." };
  }

  const parsed = deleteForumReplySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodError(parsed.error),
    };
  }

  const { replyId } = parsed.data;

  const replyMeta = await db
    .select({ threadId: forumReplies.threadId })
    .from(forumReplies)
    .where(eq(forumReplies.id, replyId))
    .limit(1);
  const tid = replyMeta[0]?.threadId;

  await db.execute(sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM forum_replies
      WHERE id = ${replyId}
        AND author_user_id = ${userId}
        AND deleted_at IS NULL
      UNION ALL
      SELECT r.id FROM forum_replies r
      INNER JOIN subtree s ON r.parent_reply_id = s.id
      WHERE r.deleted_at IS NULL
        AND r.author_user_id = ${userId}
    )
    UPDATE forum_replies
    SET deleted_at = now(), updated_at = now()
    WHERE id IN (SELECT id FROM subtree)
  `);

  if (tid) {
    const threadRows = await db
      .select()
      .from(forumThreads)
      .where(eq(forumThreads.id, tid))
      .limit(1);
    const t = threadRows[0];
    if (t) {
      const category = await getForumCategoryById(t.categoryId);
      revalidatePath("/forums");
      if (category) {
        revalidatePath(`/forums/${category.slug}`);
        revalidatePath(`/forums/${category.slug}/${t.slug}`);
      }
    }
  }

  return { ok: true, data: undefined };
}
