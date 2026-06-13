import { describe, expect, it } from "vitest";

import { validateMediaObjectPath } from "@/lib/media/storage-paths";

describe("validateMediaObjectPath", () => {
  it("accepts maps path with safe segments", () => {
    const r = validateMediaObjectPath("maps/de_mirage/radar.png");
    expect(r).toEqual({ ok: true, path: "maps/de_mirage/radar.png" });
  });

  it("accepts maps badge path", () => {
    const r = validateMediaObjectPath("maps/de_mirage/badge.webp");
    expect(r).toEqual({ ok: true, path: "maps/de_mirage/badge.webp" });
  });

  it("rejects traversal", () => {
    const r = validateMediaObjectPath("maps/../etc/passwd");
    expect(r.ok).toBe(false);
  });

  it("rejects unknown prefix", () => {
    const r = validateMediaObjectPath("evil/map/x.png");
    expect(r.ok).toBe(false);
  });

  it("strips leading slashes", () => {
    const r = validateMediaObjectPath("/maps/a/b.png");
    expect(r).toEqual({ ok: true, path: "maps/a/b.png" });
  });

  it("accepts team avatar path", () => {
    const r = validateMediaObjectPath(
      "avatars/teams/11111111-1111-4111-8111-111111111111/logo.png",
    );
    expect(r.ok).toBe(true);
  });
});
