import { describe, expect, it } from "vitest";

import {
  appendSlugSuffix,
  FORUM_RESERVED_THREAD_SLUGS,
  isValidThreadSlug,
  slugifyThreadTitle,
} from "./thread-slug";

describe("slugifyThreadTitle", () => {
  it("normalizes title", () => {
    expect(slugifyThreadTitle("  Hello World!!  ")).toBe("hello-world");
  });

  it("falls back to thread", () => {
    expect(slugifyThreadTitle("@@@")).toBe("thread");
  });
});

describe("appendSlugSuffix", () => {
  it("appends numeric suffix", () => {
    expect(appendSlugSuffix("hello-world", 2)).toBe("hello-world-2");
  });
});

describe("FORUM_RESERVED_THREAD_SLUGS", () => {
  it("includes new", () => {
    expect(FORUM_RESERVED_THREAD_SLUGS.has("new")).toBe(true);
  });
});

describe("isValidThreadSlug", () => {
  it("rejects reserved slug", () => {
    expect(isValidThreadSlug("new")).toBe(false);
  });

  it("accepts normal slug", () => {
    expect(isValidThreadSlug("hello-world")).toBe(true);
  });
});
