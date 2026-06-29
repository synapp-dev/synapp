"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { formatZodActionError } from "@/entities/content/lib/format-zod-error";
import {
  depthAfterNewChild,
  exceedsMaxCommentDepth,
  type CommentParentRow,
} from "@/entities/players/lib/profile-comments/reply-depth";
import { db } from "@/server/db/drizzle";
import { newsComments } from "@/server/db/schema";

import {
  getNewsCommentById,
  listNewsCommentParentRows,
  listNewsCommentsForArticle,
} from "../lib/comments/queries";
import {
  createNewsCommentSchema,
  deleteNewsCommentSchema,
  loadMoreNewsCommentsSchema,
  updateNewsCommentSchema,
} from "../lib/comments/schemas";

export type NewsCommentActionErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION"
  | "PARENT_INVALID"
  | "DEPTH_EXCEEDED"
  | "FORBIDDEN"
  | "COMMENT_NOT_FOUND"
  | "SERVER_ERROR";

export type NewsCommentActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: NewsCommentActionErrorCode; message: string };

function revalidateArticle(slug: string) {
  revalidatePath(`/news/${slug}`);
}

export async function createNewsCommentAction(
  input: unknown,
): Promise<NewsCommentActionResult<{ commentId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to comment." };
  }

  const parsed = createNewsCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { articleId, body, slug } = parsed.data;
  const parentCommentId = parsed.data.parentCommentId ?? null;

  if (parentCommentId) {
    const parent = await getNewsCommentById(parentCommentId);
    if (!parent || parent.articleId !== articleId) {
      return {
        ok: false,
        code: "PARENT_INVALID",
        message: "That comment is gone or not on this article.",
      };
    }
  }

  const parentRows = await listNewsCommentParentRows(articleId);
  const byId = new Map<string, CommentParentRow>();
  for (const r of parentRows) {
    byId.set(r.id, { id: r.id, parentCommentId: r.parentCommentId });
  }

  const newDepth = depthAfterNewChild(parentCommentId, byId);
  if (newDepth < 0) {
    return {
      ok: false,
      code: "PARENT_INVALID",
      message: "Invalid parent comment.",
    };
  }
  if (exceedsMaxCommentDepth(newDepth)) {
    return {
      ok: false,
      code: "DEPTH_EXCEEDED",
      message: "Max reply depth reached. Reply higher in the thread.",
    };
  }

  const now = new Date().toISOString();

  try {
    const [row] = await db
      .insert(newsComments)
      .values({
        articleId,
        parentCommentId,
        body,
        authorUserId: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: newsComments.id });

    if (!row) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save comment.",
      };
    }

    revalidateArticle(slug);
    return { ok: true, data: { commentId: row.id } };
  } catch (err) {
    console.error("[news-comments] createNewsCommentAction", err);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function updateNewsCommentAction(
  input: unknown,
): Promise<NewsCommentActionResult<{ commentId: string }>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to comment." };
  }

  const parsed = updateNewsCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { commentId, body, slug } = parsed.data;

  const comment = await getNewsCommentById(commentId);
  if (!comment) {
    return {
      ok: false,
      code: "COMMENT_NOT_FOUND",
      message: "Comment not found.",
    };
  }
  if (comment.authorUserId !== userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t edit this comment.",
    };
  }

  const now = new Date().toISOString();

  await db
    .update(newsComments)
    .set({ body, updatedAt: now })
    .where(eq(newsComments.id, commentId));

  revalidateArticle(slug);
  return { ok: true, data: { commentId } };
}

export async function deleteNewsCommentAction(
  input: unknown,
): Promise<NewsCommentActionResult<undefined>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to comment." };
  }

  const parsed = deleteNewsCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { commentId, slug } = parsed.data;

  const comment = await getNewsCommentById(commentId);
  if (!comment) {
    return {
      ok: false,
      code: "COMMENT_NOT_FOUND",
      message: "Comment not found.",
    };
  }
  if (comment.authorUserId !== userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t delete this comment.",
    };
  }

  const now = new Date().toISOString();
  await db
    .update(newsComments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(newsComments.id, commentId));

  revalidateArticle(slug);
  return { ok: true, data: undefined };
}

export async function loadMoreNewsCommentsAction(
  input: unknown,
): Promise<
  NewsCommentActionResult<Awaited<ReturnType<typeof listNewsCommentsForArticle>>>
> {
  const parsed = loadMoreNewsCommentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { articleId, cursorCreatedAt, cursorId } = parsed.data;

  const page = await listNewsCommentsForArticle(articleId, {
    cursor: { createdAt: cursorCreatedAt, id: cursorId },
  });

  return { ok: true, data: page };
}
