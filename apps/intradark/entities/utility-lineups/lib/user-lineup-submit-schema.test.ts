import { describe, expect, it } from "vitest";

import { userLineupFinalizeSchema } from "./user-lineup-submit-schema";

const base = {
  mapId: "550e8400-e29b-41d4-a716-446655440000",
  mapSlug: "de_mirage",
  videoObjectPath: "utility/de_mirage/smoke/x.mp4",
  throwSpotX: 0.1,
  throwSpotY: 0.2,
  landSpotX: 0.3,
  landSpotY: 0.4,
  throwLabel: "A",
  landLabel: "B",
  grenadeType: "smoke" as const,
  side: "t" as const,
  movement: "stationary" as const,
  technique: "left_click" as const,
  margin: "medium" as const,
  videoStartMs: 0,
  videoEndMs: null,
  description: "d",
};

describe("userLineupFinalizeSchema", () => {
  it("rejects grenade_release_ms after grenade_bloom_ms", () => {
    const r = userLineupFinalizeSchema.safeParse({
      ...base,
      grenadeReleaseMs: 5000,
      grenadeBloomMs: 1000,
    });
    expect(r.success).toBe(false);
  });

  it("accepts aligned markers", () => {
    const r = userLineupFinalizeSchema.safeParse({
      ...base,
      stillStandMs: 0,
      stillThrowMs: 1200,
      stillLandMs: 4500,
      grenadeReleaseMs: 2000,
      grenadeBloomMs: 4000,
      videoEndMs: 6000,
    });
    expect(r.success).toBe(true);
  });

  it("rejects marker not multiple of 100 ms", () => {
    const r = userLineupFinalizeSchema.safeParse({
      ...base,
      stillThrowMs: 150,
    });
    expect(r.success).toBe(false);
  });

  it("accepts youtubeUrl: null (storage-only lineup)", () => {
    const r = userLineupFinalizeSchema.safeParse({ ...base, youtubeUrl: null });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.youtubeUrl).toBeNull();
  });

  it("accepts omitted youtubeUrl", () => {
    const r = userLineupFinalizeSchema.safeParse({ ...base });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.youtubeUrl).toBeNull();
  });
});
