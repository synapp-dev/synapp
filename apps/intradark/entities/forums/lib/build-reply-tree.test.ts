import { describe, expect, it } from "vitest";

import { buildReplyTree, type ForumReplyFlat } from "./build-reply-tree";

const base = (r: Partial<ForumReplyFlat> & Pick<ForumReplyFlat, "id">): ForumReplyFlat => ({
  threadId: "t1",
  parentReplyId: null,
  body: "b",
  authorUserId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  authorDisplayName: null,
  authorUsername: null,
  authorAvatar: null,
  authorCountryFlag: null,
  authorSteamid64: null,
  ...r,
});

describe("buildReplyTree", () => {
  it("orders roots by createdAt and nests children", () => {
    const flat: ForumReplyFlat[] = [
      base({ id: "b", createdAt: "2026-01-01T00:00:02.000Z" }),
      base({ id: "a", createdAt: "2026-01-01T00:00:01.000Z" }),
      base({
        id: "c",
        parentReplyId: "a",
        createdAt: "2026-01-01T00:00:03.000Z",
      }),
    ];
    const tree = buildReplyTree(flat);
    expect(tree.map((n) => n.id)).toEqual(["a", "b"]);
    const a = tree.find((n) => n.id === "a");
    expect(a?.children.map((c) => c.id)).toEqual(["c"]);
  });

  it("lifts orphan when parent missing from list", () => {
    const flat: ForumReplyFlat[] = [
      base({
        id: "x",
        parentReplyId: "missing",
        createdAt: "2026-01-01T00:00:01.000Z",
      }),
    ];
    const tree = buildReplyTree(flat);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("x");
    expect(tree[0]?.children).toEqual([]);
  });
});
