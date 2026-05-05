import { describe, expect, it } from "vitest";

import {
  appendSlugSuffix,
  RESERVED_SLUGS,
  slugifyTitle,
  validateSlug,
} from "./slug";

describe("slugifyTitle", () => {
  it("normalizes spaces and punctuation to hyphens", () => {
    expect(slugifyTitle("  Major  Win!  ")).toBe("major-win");
  });

  it("returns fallback when title has no ascii letters or digits", () => {
    expect(slugifyTitle("   ")).toBe("article");
    expect(slugifyTitle("🎉")).toBe("article");
  });

  it("truncates to max length without trailing hyphen", () => {
    const long = "a".repeat(200);
    const out = slugifyTitle(long);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("appendSlugSuffix", () => {
  it("appends numeric suffix within max length", () => {
    expect(appendSlugSuffix("my-post", 2)).toBe("my-post-2");
  });
});

describe("validateSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateSlug("patch-notes-2026")).toEqual({ ok: true });
  });

  it("rejects empty", () => {
    expect(validateSlug("   ")).toEqual({ ok: false, code: "empty" });
  });

  it("rejects reserved segments", () => {
    for (const r of RESERVED_SLUGS) {
      expect(validateSlug(r)).toEqual({ ok: false, code: "reserved" });
    }
  });

  it("rejects invalid characters", () => {
    expect(validateSlug("bad_slug")).toEqual({
      ok: false,
      code: "invalid_chars",
    });
  });
});
