import { z } from "zod";

import {
  FORUM_MAX_BODY_LEN,
  FORUM_MAX_TAGS,
  FORUM_MAX_TITLE_LEN,
} from "./constants";
import { isValidThreadSlug } from "./thread-slug";

const tagSlug = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const createForumThreadSchema = z.object({
  categorySlug: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1).max(FORUM_MAX_TITLE_LEN),
  body: z.string().min(1).max(FORUM_MAX_BODY_LEN),
  tagSlugs: z.array(tagSlug).max(FORUM_MAX_TAGS).default([]),
});

export const createForumReplySchema = z.object({
  threadId: z.string().uuid(),
  parentReplyId: z.string().uuid().nullable().optional(),
  body: z.string().min(1).max(FORUM_MAX_BODY_LEN),
});

export const deleteForumThreadSchema = z.object({
  threadId: z.string().uuid(),
});

export const deleteForumReplySchema = z.object({
  replyId: z.string().uuid(),
});

export function parseThreadSlugInput(
  slug: string,
): { ok: true; slug: string } | { ok: false; message: string } {
  const s = slug.trim().toLowerCase();
  if (!isValidThreadSlug(s)) {
    return { ok: false, message: "Invalid thread slug" };
  }
  return { ok: true, slug: s };
}

export type CreateForumThreadInput = z.infer<typeof createForumThreadSchema>;
export type CreateForumReplyInput = z.infer<typeof createForumReplySchema>;
