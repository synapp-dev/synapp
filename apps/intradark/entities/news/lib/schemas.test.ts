import { describe, expect, it } from "vitest";

import {
  createArticleDraftSchemaWithSlug,
  updateArticleDraftSchemaWithSlug,
} from "./schemas";

describe("createArticleDraftSchemaWithSlug", () => {
  it("requires title", () => {
    const r = createArticleDraftSchemaWithSlug.safeParse({ title: "" });
    expect(r.success).toBe(false);
  });

  it("validates optional slug", () => {
    const bad = createArticleDraftSchemaWithSlug.safeParse({
      title: "Hello",
      slug: "bad_slug",
    });
    expect(bad.success).toBe(false);

    const good = createArticleDraftSchemaWithSlug.safeParse({
      title: "Hello",
      slug: "good-slug",
    });
    expect(good.success).toBe(true);
  });
});

describe("updateArticleDraftSchemaWithSlug", () => {
  it("rejects reserved slug", () => {
    const r = updateArticleDraftSchemaWithSlug.safeParse({
      id: "00000000-0000-4000-8000-000000000001",
      title: "T",
      slug: "admin",
      excerpt: null,
      bodyJson: {},
    });
    expect(r.success).toBe(false);
  });
});
