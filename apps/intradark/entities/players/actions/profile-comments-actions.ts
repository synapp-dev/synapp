"use server";

import { track } from "@vercel/analytics/server";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { getSessionUserId } from "@/entities/admin/lib/auth-session";
import { formatZodActionError } from "@/entities/content/lib/format-zod-error";
import { ensurePlayer } from "@/entities/players/lib/server/registry";
import { getCurrentUserProfiles } from "@/lib/get-current-user-profiles";
import { db } from "@/server/db/drizzle";
import {
  playerProfileCommentReports,
  playerProfileComments,
  playerProfileTrustVotes,
} from "@/server/db/schema";
import { createAdminClient } from "@/utils/supabase/admin";

import type {
  ProfileCommentActionErrorCode,
  ProfileCommentActionResult,
} from "../lib/profile-comments/action-types";
import type { ProfileTrustSignal } from "../lib/profile-comments/constants";
import {
  assertTrustVoteAllowed,
  resolveProfileCommentEligibility,
} from "../lib/profile-comments/eligibility";
import {
  countRecentCommentsForProfile,
  getCommentById,
  getExistingTrustVote,
  listCommentParentRows,
  listCommentsForSubject,
} from "../lib/profile-comments/queries";
import {
  checkCommentRateLimit,
  checkTrustVoteRateLimit,
} from "../lib/profile-comments/rate-limits";
import {
  depthAfterNewChild,
  exceedsMaxCommentDepth,
  type CommentParentRow,
} from "../lib/profile-comments/reply-depth";
import {
  createPlayerProfileCommentSchema,
  deletePlayerProfileCommentSchema,
  loadMorePlayerProfileCommentsSchema,
  reportPlayerProfileCommentSchema,
  updatePlayerProfileCommentSchema,
} from "../lib/profile-comments/schemas";

function revalidatePlayerProfilePaths(
  steamid64: string,
  linkedUsername?: string | null,
) {
  revalidatePath(`/players/${steamid64}`);
  if (linkedUsername) {
    revalidatePath(`/players/@${linkedUsername}`);
  }
}

type SteamLinkedWriterResult =
  | { ok: true; userId: string; steamProfileId: string }
  | { ok: false; code: ProfileCommentActionErrorCode; message: string };

async function requireSteamLinkedWriter(): Promise<SteamLinkedWriterResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in to comment." };
  }

  const profiles = await getCurrentUserProfiles();
  if (!profiles?.userProfile.steam_profile_id) {
    return {
      ok: false,
      code: "STEAM_NOT_LINKED",
      message: "Link your Steam account to comment.",
    };
  }

  return {
    ok: true,
    userId,
    steamProfileId: profiles.userProfile.steam_profile_id,
  };
}

async function maybeUpsertTrustVote(input: {
  subjectSteamid64: string;
  voterUserId: string;
  voterSteamProfileId: string;
  trustSignal: ProfileTrustSignal | null | undefined;
  sourceCommentId: string;
}): Promise<ProfileCommentActionResult<undefined>> {
  if (input.trustSignal == null) {
    return { ok: true, data: undefined };
  }

  if (
    !assertTrustVoteAllowed({
      voterSteamProfileId: input.voterSteamProfileId,
      subjectSteamid64: input.subjectSteamid64,
    })
  ) {
    return {
      ok: false,
      code: "SELF_VOTE_NOT_ALLOWED",
      message: "You can’t vote on your own profile.",
    };
  }

  const existing = await getExistingTrustVote(
    input.subjectSteamid64,
    input.voterUserId,
  );

  if (
    !checkTrustVoteRateLimit({
      existingSignal: (existing?.signal as ProfileTrustSignal | null) ?? null,
      existingUpdatedAt: existing?.updatedAt ?? null,
      newSignal: input.trustSignal,
    })
  ) {
    return {
      ok: false,
      code: "RATE_LIMIT_TRUST_VOTE",
      message: "You can change your trust vote once per day on this profile.",
    };
  }

  const now = new Date().toISOString();

  await db
    .insert(playerProfileTrustVotes)
    .values({
      subjectSteamid64: input.subjectSteamid64,
      voterUserId: input.voterUserId,
      signal: input.trustSignal,
      sourceCommentId: input.sourceCommentId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        playerProfileTrustVotes.subjectSteamid64,
        playerProfileTrustVotes.voterUserId,
      ],
      set: {
        signal: input.trustSignal,
        sourceCommentId: input.sourceCommentId,
        updatedAt: now,
      },
    });

  try {
    const h = await headers();
    await track(
      "player_profile_trust_vote_updated",
      {
        subject_steamid64: input.subjectSteamid64,
        signal: input.trustSignal,
      },
      { request: { headers: h } },
    );
  } catch (e) {
    console.warn("[profile-comments] analytics track failed", e);
  }

  return { ok: true, data: undefined };
}

export async function createPlayerProfileCommentAction(
  input: unknown,
): Promise<ProfileCommentActionResult<{ commentId: string }>> {
  const writer = await requireSteamLinkedWriter();
  if (!writer.ok) return writer;

  const parsed = createPlayerProfileCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { subjectSteamid64, body, trustSignal, linkedUsername } = parsed.data;
  const parentCommentId = parsed.data.parentCommentId ?? null;

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentCount = await countRecentCommentsForProfile(
    writer.userId,
    subjectSteamid64,
    sinceIso,
  );
  if (!checkCommentRateLimit(recentCount)) {
    return {
      ok: false,
      code: "RATE_LIMIT_COMMENTS",
      message:
        "Comment limit reached for this profile today. Try again tomorrow.",
    };
  }

  const admin = createAdminClient();
  await ensurePlayer(admin, subjectSteamid64);

  if (parentCommentId) {
    const parent = await getCommentById(parentCommentId);
    if (!parent || parent.subjectSteamid64 !== subjectSteamid64) {
      return {
        ok: false,
        code: "PARENT_INVALID",
        message: "That comment is gone or not on this profile.",
      };
    }
  }

  const parentRows = await listCommentParentRows(subjectSteamid64);
  const byId = new Map<string, CommentParentRow>();
  for (const r of parentRows) {
    byId.set(r.id, {
      id: r.id,
      parentCommentId: r.parentCommentId,
    });
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
      .insert(playerProfileComments)
      .values({
        subjectSteamid64,
        parentCommentId,
        body,
        authorUserId: writer.userId,
        trustSignal: trustSignal ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: playerProfileComments.id });

    if (!row) {
      return {
        ok: false,
        code: "SERVER_ERROR",
        message: "Could not save comment.",
      };
    }

    const voteResult = await maybeUpsertTrustVote({
      subjectSteamid64,
      voterUserId: writer.userId,
      voterSteamProfileId: writer.steamProfileId,
      trustSignal,
      sourceCommentId: row.id,
    });
    if (!voteResult.ok) {
      await db
        .update(playerProfileComments)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(playerProfileComments.id, row.id));
      return voteResult;
    }

    revalidatePlayerProfilePaths(subjectSteamid64, linkedUsername);

    try {
      const h = await headers();
      await track(
        "player_profile_comment_created",
        {
          subject_steamid64: subjectSteamid64,
          has_trust_signal: Boolean(trustSignal),
          is_reply: Boolean(parentCommentId),
        },
        { request: { headers: h } },
      );
    } catch (e) {
      console.warn("[profile-comments] analytics track failed", e);
    }

    return { ok: true, data: { commentId: row.id } };
  } catch (err) {
    console.error("[profile-comments] createPlayerProfileCommentAction", err);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function updatePlayerProfileCommentAction(
  input: unknown,
): Promise<ProfileCommentActionResult<{ commentId: string }>> {
  const writer = await requireSteamLinkedWriter();
  if (!writer.ok) return writer;

  const parsed = updatePlayerProfileCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { commentId, body, trustSignal, linkedUsername } = parsed.data;

  const comment = await getCommentById(commentId);
  if (!comment) {
    return {
      ok: false,
      code: "COMMENT_NOT_FOUND",
      message: "Comment not found.",
    };
  }
  if (comment.authorUserId !== writer.userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t edit this comment.",
    };
  }

  const now = new Date().toISOString();

  if (trustSignal != null) {
    const voteResult = await maybeUpsertTrustVote({
      subjectSteamid64: comment.subjectSteamid64,
      voterUserId: writer.userId,
      voterSteamProfileId: writer.steamProfileId,
      trustSignal,
      sourceCommentId: commentId,
    });
    if (!voteResult.ok) return voteResult;
  }

  await db
    .update(playerProfileComments)
    .set({
      body,
      trustSignal:
        trustSignal !== undefined ? trustSignal : comment.trustSignal,
      updatedAt: now,
    })
    .where(eq(playerProfileComments.id, commentId));

  revalidatePlayerProfilePaths(comment.subjectSteamid64, linkedUsername);

  return { ok: true, data: { commentId } };
}

export async function deletePlayerProfileCommentAction(
  input: unknown,
): Promise<ProfileCommentActionResult<undefined>> {
  const writer = await requireSteamLinkedWriter();
  if (!writer.ok) return writer;

  const parsed = deletePlayerProfileCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { commentId, linkedUsername } = parsed.data;

  const comment = await getCommentById(commentId);
  if (!comment) {
    return {
      ok: false,
      code: "COMMENT_NOT_FOUND",
      message: "Comment not found.",
    };
  }
  if (comment.authorUserId !== writer.userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t delete this comment.",
    };
  }

  const now = new Date().toISOString();
  await db
    .update(playerProfileComments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(playerProfileComments.id, commentId));

  revalidatePlayerProfilePaths(comment.subjectSteamid64, linkedUsername);

  return { ok: true, data: undefined };
}

export async function reportPlayerProfileCommentAction(
  input: unknown,
): Promise<ProfileCommentActionResult<undefined>> {
  const writer = await requireSteamLinkedWriter();
  if (!writer.ok) return writer;

  const parsed = reportPlayerProfileCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { commentId, reason } = parsed.data;

  const comment = await getCommentById(commentId);
  if (!comment) {
    return {
      ok: false,
      code: "COMMENT_NOT_FOUND",
      message: "Comment not found.",
    };
  }

  if (comment.authorUserId === writer.userId) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "You can’t report your own comment.",
    };
  }

  const now = new Date().toISOString();

  try {
    await db
      .insert(playerProfileCommentReports)
      .values({
        commentId,
        reporterUserId: writer.userId,
        reason: reason ?? null,
        createdAt: now,
      })
      .onConflictDoNothing();

    try {
      const h = await headers();
      await track(
        "player_profile_comment_reported",
        { comment_id: commentId },
        { request: { headers: h } },
      );
    } catch (e) {
      console.warn("[profile-comments] analytics track failed", e);
    }

    return { ok: true, data: undefined };
  } catch (err) {
    console.error("[profile-comments] reportPlayerProfileCommentAction", err);
    return {
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong. Try again.",
    };
  }
}

export async function loadMorePlayerProfileCommentsAction(
  input: unknown,
): Promise<
  ProfileCommentActionResult<Awaited<ReturnType<typeof listCommentsForSubject>>>
> {
  const parsed = loadMorePlayerProfileCommentsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: formatZodActionError(parsed.error),
    };
  }

  const { subjectSteamid64, cursorCreatedAt, cursorId } = parsed.data;

  const page = await listCommentsForSubject(subjectSteamid64, {
    cursor: { createdAt: cursorCreatedAt, id: cursorId },
  });

  return { ok: true, data: page };
}

export async function getProfileCommentEligibilityForViewer(input: {
  subjectSteamid64: string;
  isProfileOwner: boolean;
}) {
  const userId = await getSessionUserId();
  const profiles = userId ? await getCurrentUserProfiles() : null;

  return resolveProfileCommentEligibility({
    isSignedIn: Boolean(userId),
    steamProfileId: profiles?.userProfile.steam_profile_id,
    isProfileOwner: input.isProfileOwner,
  });
}
