import { describe, expect, it } from "vitest";

import { evaluateEligibility } from "./eligibility";

const now = new Date("2026-06-20T12:00:00.000Z");

describe("evaluateEligibility", () => {
  it("requires a linked Steam account", () => {
    const v = evaluateEligibility({
      steamLinked: false,
      discordLinked: true,
      cooldownUntil: null,
      now,
    });
    expect(v.eligible).toBe(false);
    expect(v.reason).toMatch(/steam/i);
  });

  it("requires a linked Discord account", () => {
    const v = evaluateEligibility({
      steamLinked: true,
      discordLinked: false,
      cooldownUntil: null,
      now,
    });
    expect(v.eligible).toBe(false);
    expect(v.reason).toMatch(/discord/i);
  });

  it("blocks while an unexpired cooldown is active", () => {
    const v = evaluateEligibility({
      steamLinked: true,
      discordLinked: true,
      cooldownUntil: new Date("2026-06-20T12:05:00.000Z"),
      now,
    });
    expect(v.eligible).toBe(false);
    expect(v.reason).toMatch(/cooldown/i);
  });

  it("ignores an expired cooldown", () => {
    const v = evaluateEligibility({
      steamLinked: true,
      discordLinked: true,
      cooldownUntil: new Date("2026-06-20T11:55:00.000Z"),
      now,
    });
    expect(v.eligible).toBe(true);
    expect(v.reason).toBeNull();
  });

  it("passes a fully linked, cooldown-free player", () => {
    const v = evaluateEligibility({
      steamLinked: true,
      discordLinked: true,
      cooldownUntil: null,
      now,
    });
    expect(v.eligible).toBe(true);
  });
});
