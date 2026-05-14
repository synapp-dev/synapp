import { describe, expect, it } from "vitest";

import { utilityLineupUploadEligibilityIssue } from "./utility-lineup-upload-eligibility";

describe("utilityLineupUploadEligibilityIssue", () => {
  it("returns null when fully linked", () => {
    expect(
      utilityLineupUploadEligibilityIssue({
        emailConfirmedAt: "2026-01-01",
        steamProfileId: 123,
        discordUserId: "snowflake",
        hasProfileRow: true,
      }),
    ).toBeNull();
  });

  it("requires profile row", () => {
    expect(
      utilityLineupUploadEligibilityIssue({
        emailConfirmedAt: "2026-01-01",
        steamProfileId: 123,
        discordUserId: "x",
        hasProfileRow: false,
      }),
    ).toBe("NO_PROFILE");
  });

  it("requires verified email", () => {
    expect(
      utilityLineupUploadEligibilityIssue({
        emailConfirmedAt: null,
        steamProfileId: 123,
        discordUserId: "x",
        hasProfileRow: true,
      }),
    ).toBe("EMAIL_NOT_VERIFIED");
  });

  it("requires Steam", () => {
    expect(
      utilityLineupUploadEligibilityIssue({
        emailConfirmedAt: "2026-01-01",
        steamProfileId: null,
        discordUserId: "x",
        hasProfileRow: true,
      }),
    ).toBe("STEAM_NOT_LINKED");
  });

  it("requires Discord", () => {
    expect(
      utilityLineupUploadEligibilityIssue({
        emailConfirmedAt: "2026-01-01",
        steamProfileId: 1,
        discordUserId: "   ",
        hasProfileRow: true,
      }),
    ).toBe("DISCORD_NOT_LINKED");
  });
});
