import { describe, expect, it } from "vitest";
import {
  buildLessonUpdateMetadata,
  evaluateLessonStatusChange,
  statusChangeRequiresPlatformAdmin,
} from "./update-rules";

const TS = "2026-07-07T05:00:00.000Z";

describe("statusChangeRequiresPlatformAdmin", () => {
  it("requires an admin only for cancel from feedback or completed", () => {
    expect(
      statusChangeRequiresPlatformAdmin({
        requestedStatus: "cancelled",
        currentStatus: "feedback",
      })
    ).toBe(true);
    expect(
      statusChangeRequiresPlatformAdmin({
        requestedStatus: "cancelled",
        currentStatus: "completed",
      })
    ).toBe(true);
    expect(
      statusChangeRequiresPlatformAdmin({
        requestedStatus: "cancelled",
        currentStatus: "ready",
      })
    ).toBe(false);
    expect(
      statusChangeRequiresPlatformAdmin({
        requestedStatus: "feedback",
        currentStatus: "in_progress",
      })
    ).toBe(false);
    expect(
      statusChangeRequiresPlatformAdmin({ currentStatus: "feedback" })
    ).toBe(false);
  });
});

describe("evaluateLessonStatusChange", () => {
  it("lets the owner move a lesson to feedback", () => {
    expect(
      evaluateLessonStatusChange({
        requestedStatus: "feedback",
        currentStatus: "in_progress",
        actorIsOwner: true,
        actorIsPlatformAdmin: false,
      })
    ).toEqual({ allowed: true });
  });

  it("blocks non-owners from moving a lesson to feedback, admins included", () => {
    const verdict = evaluateLessonStatusChange({
      requestedStatus: "feedback",
      currentStatus: "in_progress",
      actorIsOwner: false,
      actorIsPlatformAdmin: true,
    });
    expect(verdict).toEqual({
      allowed: false,
      reason: "Only the lesson owner can transition the lesson to feedback.",
    });
  });

  it("blocks non-admin cancel from feedback and completed", () => {
    for (const currentStatus of ["feedback", "completed"]) {
      const verdict = evaluateLessonStatusChange({
        requestedStatus: "cancelled",
        currentStatus,
        actorIsOwner: true,
        actorIsPlatformAdmin: false,
      });
      expect(verdict).toEqual({
        allowed: false,
        reason:
          "Only platform admins can cancel a lesson that is in feedback or completed.",
      });
    }
  });

  it("lets a platform admin cancel from feedback", () => {
    expect(
      evaluateLessonStatusChange({
        requestedStatus: "cancelled",
        currentStatus: "feedback",
        actorIsOwner: false,
        actorIsPlatformAdmin: true,
      })
    ).toEqual({ allowed: true });
  });

  it("lets anyone cancel from earlier states", () => {
    expect(
      evaluateLessonStatusChange({
        requestedStatus: "cancelled",
        currentStatus: "preparing",
        actorIsOwner: false,
        actorIsPlatformAdmin: false,
      })
    ).toEqual({ allowed: true });
  });

  it("allows updates that do not touch status", () => {
    expect(
      evaluateLessonStatusChange({
        currentStatus: "feedback",
        actorIsOwner: false,
        actorIsPlatformAdmin: false,
      })
    ).toEqual({ allowed: true });
  });
});

describe("buildLessonUpdateMetadata", () => {
  const existing = {
    status: "ready",
    scheduledFor: null as string | null,
    createdByUserId: "owner-1",
    metadata: null as unknown,
  };
  const actor = { userId: "actor-1", userName: "Casey Actor" };

  it("returns undefined when nothing changed and no history exists", () => {
    expect(
      buildLessonUpdateMetadata({
        existing,
        changes: {},
        actor,
        timestamp: TS,
      })
    ).toBeUndefined();
  });

  it("records a status transition with the exact event shape", () => {
    const meta = buildLessonUpdateMetadata({
      existing,
      changes: { status: "in_progress" },
      actor,
      timestamp: TS,
    });
    expect(meta).toEqual({
      eventHistory: [
        {
          type: "status_transition",
          userId: "actor-1",
          userName: "Casey Actor",
          timestamp: TS,
          payload: { fromStatus: "ready", toStatus: "in_progress" },
        },
      ],
    });
  });

  it("records a schedule change, mapping a null previous date to undefined", () => {
    const meta = buildLessonUpdateMetadata({
      existing,
      changes: { scheduledFor: "2026-07-10T00:00:00.000Z" },
      actor,
      timestamp: TS,
    });
    expect(meta?.eventHistory).toEqual([
      {
        type: "scheduled",
        userId: "actor-1",
        userName: "Casey Actor",
        timestamp: TS,
        payload: {
          previousScheduledFor: undefined,
          scheduledFor: "2026-07-10T00:00:00.000Z",
        },
      },
    ]);
  });

  it("ignores no-op values that match the existing row", () => {
    expect(
      buildLessonUpdateMetadata({
        existing: { ...existing, status: "ready", scheduledFor: "2026-07-10" },
        changes: { status: "ready", scheduledFor: "2026-07-10" },
        actor,
        timestamp: TS,
      })
    ).toBeUndefined();
  });

  it("appends both events in order when status and schedule change together", () => {
    const meta = buildLessonUpdateMetadata({
      existing,
      changes: { status: "ready", scheduledFor: "2026-07-10" },
      actor,
      timestamp: TS,
    });
    // status equals existing so only the schedule event lands
    expect(meta?.eventHistory).toHaveLength(1);

    const meta2 = buildLessonUpdateMetadata({
      existing,
      changes: { status: "in_progress", scheduledFor: "2026-07-10" },
      actor,
      timestamp: TS,
    });
    expect(
      (meta2?.eventHistory as Array<{ type: string }>).map((e) => e.type)
    ).toEqual(["status_transition", "scheduled"]);
  });

  it("appends to existing history and preserves other metadata keys", () => {
    const meta = buildLessonUpdateMetadata({
      existing: {
        ...existing,
        metadata: {
          eventHistory: [{ type: "status_transition", payload: {} }],
          keepMe: true,
        },
      },
      changes: { status: "in_progress" },
      actor,
      timestamp: TS,
    });
    expect(meta?.keepMe).toBe(true);
    expect(meta?.eventHistory).toHaveLength(2);
  });

  it("stamps feedbackOwnerUserId when moving into feedback", () => {
    const meta = buildLessonUpdateMetadata({
      existing: { ...existing, status: "in_progress" },
      changes: { status: "feedback" },
      actor,
      timestamp: TS,
    });
    expect(meta?.feedbackOwnerUserId).toBe("owner-1");
  });

  it("preserves the historic quirk: re-submitting feedback on a feedback lesson with prior history re-stamps the owner", () => {
    const meta = buildLessonUpdateMetadata({
      existing: {
        ...existing,
        status: "feedback",
        metadata: { eventHistory: [{ type: "status_transition" }] },
      },
      changes: { status: "feedback" },
      actor,
      timestamp: TS,
    });
    // no new event, but existing history keeps metadata truthy and the
    // requested feedback status stamps the owner, exactly as before
    expect(meta?.eventHistory).toHaveLength(1);
    expect(meta?.feedbackOwnerUserId).toBe("owner-1");
  });
});
