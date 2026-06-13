import { z } from "zod";

import {
  PLAYER_PROFILE_MAX_BODY_LENGTH,
  TRUST_SIGNALS,
} from "./constants";

const trustSignalSchema = z.enum(TRUST_SIGNALS);

export const createPlayerProfileCommentSchema = z.object({
  subjectSteamid64: z.string().trim().min(1).max(32),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(PLAYER_PROFILE_MAX_BODY_LENGTH),
  trustSignal: trustSignalSchema.nullable().optional(),
  /** For cache revalidation of @username canonical URLs. */
  linkedUsername: z.string().trim().min(1).max(64).nullable().optional(),
});

export const updatePlayerProfileCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(PLAYER_PROFILE_MAX_BODY_LENGTH),
  trustSignal: trustSignalSchema.nullable().optional(),
  linkedUsername: z.string().trim().min(1).max(64).nullable().optional(),
});

export const deletePlayerProfileCommentSchema = z.object({
  commentId: z.string().uuid(),
  linkedUsername: z.string().trim().min(1).max(64).nullable().optional(),
});

export const reportPlayerProfileCommentSchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
});

export const loadMorePlayerProfileCommentsSchema = z.object({
  subjectSteamid64: z.string().trim().min(1).max(32),
  cursorCreatedAt: z.string().min(1),
  cursorId: z.string().uuid(),
});

export type CreatePlayerProfileCommentInput = z.infer<
  typeof createPlayerProfileCommentSchema
>;
export type UpdatePlayerProfileCommentInput = z.infer<
  typeof updatePlayerProfileCommentSchema
>;
