import { z } from "zod";

import { NEWS_COMMENT_MAX_BODY_LENGTH } from "./constants";

export const createNewsCommentSchema = z.object({
  articleId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(NEWS_COMMENT_MAX_BODY_LENGTH),
  /** For cache revalidation of the article's /news/[slug] path. */
  slug: z.string().trim().min(1).max(256),
});

export const updateNewsCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(NEWS_COMMENT_MAX_BODY_LENGTH),
  slug: z.string().trim().min(1).max(256),
});

export const deleteNewsCommentSchema = z.object({
  commentId: z.string().uuid(),
  slug: z.string().trim().min(1).max(256),
});

export const loadMoreNewsCommentsSchema = z.object({
  articleId: z.string().uuid(),
  cursorCreatedAt: z.string().min(1),
  cursorId: z.string().uuid(),
});

export type CreateNewsCommentInput = z.infer<typeof createNewsCommentSchema>;
export type UpdateNewsCommentInput = z.infer<typeof updateNewsCommentSchema>;
