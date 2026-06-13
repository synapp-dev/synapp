import { describe, expect, it } from "vitest";

import {
  earlyOnboardingUnlockedSuffixes,
  isEarlyOnboardingScopedPathAllowed,
  isRouteUnlockedDuringSetup,
  pathSuffixFromNavUrl,
} from "@/lib/onboarding/module-gates";

describe("module-gates", () => {
  it("unlocks sales only when Square is connected", () => {
    expect(earlyOnboardingUnlockedSuffixes(false)).toEqual([]);
    expect(earlyOnboardingUnlockedSuffixes(true)).toEqual(["insights/sales"]);
  });

  it("matches insights sales path suffix", () => {
    expect(isRouteUnlockedDuringSetup("insights/sales", true)).toBe(true);
    expect(isRouteUnlockedDuringSetup("insights/labour", true)).toBe(false);
  });

  it("parses scoped nav URLs", () => {
    expect(pathSuffixFromNavUrl("/acme/main/insights/sales")).toBe(
      "insights/sales",
    );
    expect(pathSuffixFromNavUrl("/setup")).toBeNull();
  });

  it("allows scoped pathname during early onboarding when Square connected", () => {
    expect(
      isEarlyOnboardingScopedPathAllowed("/acme/main/insights/sales", true),
    ).toBe(true);
    expect(
      isEarlyOnboardingScopedPathAllowed("/acme/main/insights/labour", true),
    ).toBe(false);
  });
});
