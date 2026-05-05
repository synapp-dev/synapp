import { describe, expect, it } from "vitest";

import { FORUM_MAX_REPLY_DEPTH } from "./constants";
import {
  depthAfterNewChild,
  exceedsMaxReplyDepth,
  replyDepthFromParentMap,
  type ReplyParentRow,
} from "./reply-depth";

function map(rows: ReplyParentRow[]) {
  return new Map(rows.map((r) => [r.id, r]));
}

describe("replyDepthFromParentMap", () => {
  it("root depth is 0", () => {
    const m = map([{ id: "a", parentReplyId: null }]);
    expect(replyDepthFromParentMap("a", m)).toBe(0);
  });

  it("counts chain", () => {
    const m = map([
      { id: "a", parentReplyId: null },
      { id: "b", parentReplyId: "a" },
      { id: "c", parentReplyId: "b" },
    ]);
    expect(replyDepthFromParentMap("c", m)).toBe(2);
  });
});

describe("depthAfterNewChild", () => {
  it("null parent is depth 0", () => {
    expect(depthAfterNewChild(null, new Map())).toBe(0);
  });

  it("child depth is parent + 1", () => {
    const m = map([
      { id: "a", parentReplyId: null },
      { id: "b", parentReplyId: "a" },
    ]);
    expect(depthAfterNewChild("b", m)).toBe(2);
  });
});

describe("exceedsMaxReplyDepth", () => {
  it("respects FORUM_MAX_REPLY_DEPTH", () => {
    expect(exceedsMaxReplyDepth(FORUM_MAX_REPLY_DEPTH)).toBe(false);
    expect(exceedsMaxReplyDepth(FORUM_MAX_REPLY_DEPTH + 1)).toBe(true);
  });
});
