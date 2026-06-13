import { describe, expect, it } from "vitest";

import { buildCommentTree } from "./build-comment-tree";
import { assertTrustVoteAllowed, resolveProfileCommentEligibility } from "./eligibility";
import { exceedsMaxCommentDepth, depthAfterNewChild } from "./reply-depth";
import { checkCommentRateLimit, checkTrustVoteRateLimit } from "./rate-limits";

describe("buildCommentTree", () => {
  it("nests replies under parents oldest-first", () => {
    const flat = [
      {
        id: "a",
        subjectSteamid64: "1",
        parentCommentId: null,
        body: "root",
        authorUserId: "u1",
        trustSignal: null,
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
        authorUsername: "a",
        authorAvatar: null,
      },
      {
        id: "b",
        subjectSteamid64: "1",
        parentCommentId: "a",
        body: "child",
        authorUserId: "u2",
        trustSignal: null,
        createdAt: "2026-01-03T00:00:00Z",
        updatedAt: "2026-01-03T00:00:00Z",
        authorUsername: "b",
        authorAvatar: null,
      },
    ];
    const tree = buildCommentTree(flat);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children[0]?.id).toBe("b");
  });
});

describe("reply depth", () => {
  it("allows depth 3", () => {
    expect(exceedsMaxCommentDepth(3)).toBe(false);
    expect(exceedsMaxCommentDepth(4)).toBe(true);
  });

  it("computes child depth from parent map", () => {
    const map = new Map([
      ["a", { id: "a", parentCommentId: null }],
      ["b", { id: "b", parentCommentId: "a" }],
    ]);
    expect(depthAfterNewChild("b", map)).toBe(2);
  });
});

describe("eligibility", () => {
  it("requires steam link to write", () => {
    expect(
      resolveProfileCommentEligibility({
        isSignedIn: true,
        steamProfileId: null,
        isProfileOwner: false,
      }).canWrite,
    ).toBe(false);
  });

  it("blocks self-vote on own profile", () => {
    expect(
      resolveProfileCommentEligibility({
        isSignedIn: true,
        steamProfileId: "123",
        isProfileOwner: true,
      }).canVote,
    ).toBe(false);
    expect(
      assertTrustVoteAllowed({
        voterSteamProfileId: "123",
        subjectSteamid64: "123",
      }),
    ).toBe(false);
  });
});

describe("rate limits", () => {
  it("caps comments at 10 per day", () => {
    expect(checkCommentRateLimit(9)).toBe(true);
    expect(checkCommentRateLimit(10)).toBe(false);
  });

  it("allows first trust vote and same-signal updates", () => {
    expect(
      checkTrustVoteRateLimit({
        existingSignal: null,
        existingUpdatedAt: null,
        newSignal: "legit",
      }),
    ).toBe(true);
    expect(
      checkTrustVoteRateLimit({
        existingSignal: "legit",
        existingUpdatedAt: new Date().toISOString(),
        newSignal: "legit",
      }),
    ).toBe(true);
  });
});
