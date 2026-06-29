import { describe, expect, it } from "vitest";

import { buildEventDedupKey } from "@/lib/ac/dedupe";

describe("buildEventDedupKey", () => {
  it("is deterministic for the same inputs", () => {
    const a = buildEventDedupKey("user-1", "signature_match", { sig: "abc", matchId: "m1" });
    const b = buildEventDedupKey("user-1", "signature_match", { sig: "abc", matchId: "m1" });
    expect(a).toBe(b);
  });

  it("is stable regardless of key order", () => {
    const a = buildEventDedupKey("user-1", "signature_match", { sig: "abc", matchId: "m1" });
    const b = buildEventDedupKey("user-1", "signature_match", { matchId: "m1", sig: "abc" });
    expect(a).toBe(b);
  });

  it("differs by user", () => {
    const a = buildEventDedupKey("user-1", "signature_match", { sig: "abc" });
    const b = buildEventDedupKey("user-2", "signature_match", { sig: "abc" });
    expect(a).not.toBe(b);
  });

  it("differs by kind", () => {
    const a = buildEventDedupKey("user-1", "signature_match", { sig: "abc" });
    const b = buildEventDedupKey("user-1", "new_driver", { sig: "abc" });
    expect(a).not.toBe(b);
  });

  it("differs by content", () => {
    const a = buildEventDedupKey("user-1", "signature_match", { sig: "abc" });
    const b = buildEventDedupKey("user-1", "signature_match", { sig: "xyz" });
    expect(a).not.toBe(b);
  });

  it("produces a 64-char hex digest", () => {
    const key = buildEventDedupKey("user-1", "k", {});
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });
});
