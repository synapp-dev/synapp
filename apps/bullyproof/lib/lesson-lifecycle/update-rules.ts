import type { LessonPersistedStatus } from "./types";

/**
 * Pure rules for updating a Lesson: who may change status, and what lands in
 * the event history. Extracted verbatim from the update service so the rules
 * are testable through one interface; the service fetches context (owner,
 * roles, actor name) and applies the verdicts.
 */

export type LessonStatusChangeInput = {
  /** Status the caller is asking for; undefined when the update leaves status alone. */
  requestedStatus?: string;
  currentStatus: string;
  actorIsOwner: boolean;
  actorIsPlatformAdmin: boolean;
};

export type LessonStatusChangeVerdict =
  | { allowed: true }
  | { allowed: false; reason: string };

/** Cancelling from these states is reserved for platform admins. */
const ADMIN_ONLY_CANCEL_FROM: readonly LessonPersistedStatus[] = [
  "feedback",
  "completed",
];

/**
 * True when the requested change needs a platform-admin check. Lets the
 * caller skip the roles lookup on every other update.
 */
export function statusChangeRequiresPlatformAdmin(input: {
  requestedStatus?: string;
  currentStatus: string;
}): boolean {
  return (
    input.requestedStatus === "cancelled" &&
    (ADMIN_ONLY_CANCEL_FROM as readonly string[]).includes(input.currentStatus)
  );
}

export function evaluateLessonStatusChange(
  input: LessonStatusChangeInput
): LessonStatusChangeVerdict {
  // Moving to feedback is the owner's call, whoever else is acting.
  if (input.requestedStatus === "feedback" && !input.actorIsOwner) {
    return {
      allowed: false,
      reason: "Only the lesson owner can transition the lesson to feedback.",
    };
  }

  if (
    statusChangeRequiresPlatformAdmin(input) &&
    !input.actorIsPlatformAdmin
  ) {
    return {
      allowed: false,
      reason:
        "Only platform admins can cancel a lesson that is in feedback or completed.",
    };
  }

  return { allowed: true };
}

export type LessonEventActor = {
  userId: string | null;
  userName?: string;
};

export type LessonUpdateChanges = {
  status?: string;
  scheduledFor?: string | null;
};

export type LessonSnapshotForEvents = {
  status: string;
  scheduledFor: string | null;
  createdByUserId: string | null;
  metadata: unknown;
};

/**
 * Builds the metadata object to persist for an update, or undefined when
 * metadata should be left untouched. Mirrors the long-standing behaviour:
 * events append to the existing history, and metadata is (re)written whenever
 * the resulting history is non-empty, including the case where a lesson
 * already in feedback is re-submitted with status "feedback" (which stamps
 * feedbackOwnerUserId).
 */
export function buildLessonUpdateMetadata(params: {
  existing: LessonSnapshotForEvents;
  changes: LessonUpdateChanges;
  actor: LessonEventActor;
  timestamp: string;
}): Record<string, unknown> | undefined {
  const { existing, changes, actor, timestamp } = params;

  const currentMeta = (existing.metadata as Record<string, unknown>) || {};
  const history = Array.isArray(currentMeta.eventHistory)
    ? [...currentMeta.eventHistory]
    : [];

  if (changes.status !== undefined && changes.status !== existing.status) {
    history.push({
      type: "status_transition",
      userId: actor.userId,
      userName: actor.userName,
      timestamp,
      payload: { fromStatus: existing.status, toStatus: changes.status },
    });
  }

  if (
    changes.scheduledFor !== undefined &&
    changes.scheduledFor !== existing.scheduledFor
  ) {
    history.push({
      type: "scheduled",
      userId: actor.userId,
      userName: actor.userName,
      timestamp,
      payload: {
        previousScheduledFor: existing.scheduledFor ?? undefined,
        scheduledFor: changes.scheduledFor,
      },
    });
  }

  if (history.length === 0) return undefined;

  const nextMetadata: Record<string, unknown> = {
    ...currentMeta,
    eventHistory: history,
  };
  if (changes.status === "feedback") {
    nextMetadata.feedbackOwnerUserId = existing.createdByUserId;
  }
  return nextMetadata;
}
