import { describe, expect, it } from "vitest";

import { computeLegitimacy } from "@/entities/players/lib/legitimacy/score";
import type { LegitimacyInput } from "@/entities/players/lib/legitimacy/types";
import { mapTier } from "@/entities/players/lib/legitimacy/tier";

const BASE: LegitimacyInput = {
  steamid64: "76561197998479808",
};

describe("computeLegitimacy", () => {
  it("new low-skill player → unverified, not suspicious", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: new Date().toISOString(),
      communityVisibility: 3,
      hasLeetify: true,
      leetifyRating: 0.005,
      aim: 0.01,
      gamesPlayed: 5,
    });
    expect(result.tier).not.toBe("suspicious");
    expect(result.tier).toBe("unverified");
    expect(result.breakdown.coherence.suspicion).toBeLessThan(0.35);
  });

  it("high aim low util + no FACEIT → elevated suspicion", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: "2024-01-01T00:00:00.000Z",
      communityVisibility: 3,
      hasLeetify: true,
      leetifyRating: 0.04,
      aim: 0.045,
      utility: 0.005,
      positioning: 0.008,
      opening: 0.006,
      clutch: 0.007,
      gamesPlayed: 80,
      cs2PlaytimeMinutes: 2000,
    });
    expect(result.breakdown.coherence.suspicion).toBeGreaterThan(0.2);
    expect(result.rawScore).toBeLessThan(70);
  });

  it("veteran with deep history → established or trusted", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: "2014-06-01T00:00:00.000Z",
      communityVisibility: 3,
      steamLevel: 120,
      friendsCount: 180,
      badgeCount: 40,
      cs2PlaytimeMinutes: 180_000,
      hasLeetify: true,
      hasFaceit: true,
      hasGc: true,
      leetifyRating: 0.025,
      aim: 0.022,
      utility: 0.018,
      positioning: 0.02,
      faceitElo: 2800,
      faceitLevel: 9,
      gamesPlayed: 4000,
      discordLinked: true,
      emailVerified: true,
    });
    expect(["established", "trusted"]).toContain(result.tier);
    expect(result.score).toBeGreaterThan(50);
  });

  it("private veteran → mid score + low confidence", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: "2012-01-01T00:00:00.000Z",
      communityVisibility: 1,
      hasLeetify: true,
      hasFaceit: true,
      leetifyRating: 0.02,
      aim: 0.018,
      faceitElo: 2200,
      faceitLevel: 7,
      gamesPlayed: 1500,
      cs2PlaytimeMinutes: 90_000,
    });
    expect(["low", "med"]).toContain(result.confidence);
    expect(result.score).toBeGreaterThan(30);
    expect(result.score).toBeLessThan(80);
    expect(result.breakdown.penalties.some((p) => p.code === "private_profile")).toBe(
      true,
    );
  });

  it("VAC ban → suspicious tier", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: "2016-01-01T00:00:00.000Z",
      communityVisibility: 3,
      vacBanned: true,
      hasLeetify: true,
      leetifyRating: 0.02,
      gamesPlayed: 500,
    });
    expect(result.rawScore).toBeLessThan(45);
    expect(["suspicious", "unverified"]).toContain(result.tier);
    expect(result.breakdown.penalties.some((p) => p.code === "vac_ban")).toBe(true);
  });

  it("karma axis stubbed for phase 2", () => {
    const result = computeLegitimacy(BASE);
    expect(result.breakdown.axes.karma.note).toBe("phase_2");
    expect(result.breakdown.axes.karma.score).toBe(50);
  });

  it("exposes four axes with skill folded into plausibility", () => {
    const result = computeLegitimacy({
      ...BASE,
      accountCreatedAt: "2014-06-01T00:00:00.000Z",
      communityVisibility: 3,
      hasLeetify: true,
      hasFaceit: true,
      leetifyRating: 0.03,
      aim: 0.028,
      utility: 0.02,
      faceitElo: 3000,
      faceitLevel: 10,
      gamesPlayed: 3000,
      cs2PlaytimeMinutes: 120_000,
    });
    expect(Object.keys(result.breakdown.axes)).toEqual([
      "plausibility",
      "establishment",
      "corroboration",
      "karma",
    ]);
    expect(result.breakdown.axes.plausibility.weight).toBe(0.5);
  });
});

describe("mapTier", () => {
  it("maps boundary scores", () => {
    expect(mapTier(34)).toBe("suspicious");
    expect(mapTier(35)).toBe("unverified");
    expect(mapTier(54)).toBe("unverified");
    expect(mapTier(55)).toBe("established");
    expect(mapTier(75)).toBe("trusted");
  });
});
