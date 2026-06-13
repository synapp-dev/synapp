import { describe, expect, it } from "vitest";
import {
  computeShiftCostWithPack,
  resolveMinimumRateFromPack,
} from "@/server/workforce/award/award-calculation.service";
import { BUILTIN_AWARD_RULE_PACKS } from "@/server/workforce/award/award-seed-packs";

describe("award-calculation", () => {
  const pack119 = BUILTIN_AWARD_RULE_PACKS.MA000119!;

  it("returns MA000119 Level 2 adult minimum", () => {
    expect(
      resolveMinimumRateFromPack(pack119, {
        awardCode: "MA000119",
        classificationGrade: "2",
        employmentType: "full_time",
        asOfDate: "2025-07-01",
      }),
    ).toBe(2520);
  });

  it("applies Sunday casual penalty for MA000119", () => {
    const result = computeShiftCostWithPack(pack119, {
      startsAt: "2026-06-06T23:00:00.000Z",
      endsAt: "2026-06-07T04:00:00.000Z",
      breakMinutes: 0,
      hourlyRateCents: 2800,
      timezone: "Australia/Melbourne",
      employmentType: "casual",
      classificationGrade: "2",
      asOfDate: "2025-07-01",
    });
    expect(result.penaltyCostCents).toBeGreaterThan(0);
    expect(result.appliedRules.some((r) => r.toLowerCase().includes("sunday"))).toBe(true);
  });

  it("applies MA000009 Saturday FT penalty", () => {
    const pack009 = BUILTIN_AWARD_RULE_PACKS.MA000009!;
    const result = computeShiftCostWithPack(pack009, {
      startsAt: "2026-06-05T23:00:00.000Z",
      endsAt: "2026-06-06T07:00:00.000Z",
      breakMinutes: 0,
      timezone: "Australia/Melbourne",
      employmentType: "full_time",
      classificationGrade: "2",
      asOfDate: "2025-07-01",
    });
    expect(result.penaltyCostCents).toBeGreaterThan(0);
    expect(result.appliedRules.some((r) => r.toLowerCase().includes("saturday"))).toBe(true);
  });
});
