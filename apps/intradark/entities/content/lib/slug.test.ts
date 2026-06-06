import { describe, expect, it } from "vitest";

import {
  allocateUniqueUrlSlug,
  appendSlugSuffix,
  slugifyForUrl,
  validateUrlSlug,
} from "./slug";

const RESERVED = new Set(["new", "admin"]);

describe("slugifyForUrl", () => {
  it("normalizes text with fallback", () => {
    expect(slugifyForUrl("  Hello!!  ", "item")).toBe("hello");
    expect(slugifyForUrl("@@@", "thread")).toBe("thread");
  });
});

describe("validateUrlSlug", () => {
  it("rejects reserved slugs", () => {
    expect(validateUrlSlug("new", RESERVED)).toEqual({
      ok: false,
      code: "reserved",
    });
  });
});

describe("allocateUniqueUrlSlug", () => {
  it("returns preferred when free", async () => {
    const slug = await allocateUniqueUrlSlug({
      preferred: "my-post",
      slugify: (t) => slugifyForUrl(t, "item"),
      validate: (s) => validateUrlSlug(s, RESERVED),
      isTaken: async () => false,
    });
    expect(slug).toBe("my-post");
  });

  it("appends suffix when taken", async () => {
    const taken = new Set(["my-post"]);
    const slug = await allocateUniqueUrlSlug({
      preferred: "my-post",
      slugify: (t) => slugifyForUrl(t, "item"),
      validate: (s) => validateUrlSlug(s, RESERVED),
      isTaken: async (c) => taken.has(c),
    });
    expect(slug).toBe("my-post-2");
  });

  it("skips invalid candidates when skipInvalid is true", async () => {
    const slug = await allocateUniqueUrlSlug({
      preferred: "new",
      slugify: (t) => slugifyForUrl(t, "thread"),
      validate: (s) => validateUrlSlug(s, RESERVED),
      isTaken: async () => false,
      skipInvalid: true,
    });
    expect(slug).toBe(appendSlugSuffix("new", 2));
  });
});
