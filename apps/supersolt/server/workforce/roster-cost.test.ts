import { describe, expect, it } from "vitest";
import { computeShiftCost } from "@/server/workforce/roster-cost.service";

describe("computeShiftCost", () => {
  it("computes base cost for weekday shift", () => {
    const result = computeShiftCost({
      startsAt: "2026-06-02T23:00:00.000Z",
      endsAt: "2026-06-03T07:00:00.000Z",
      breakMinutes: 30,
      hourlyRateCents: 2800,
      timezone: "Australia/Melbourne",
      employmentType: "casual",
      classificationGrade: "2",
    });
    expect(result.baseCostCents).toBeGreaterThan(0);
    expect(result.computedCostCents).toBeGreaterThanOrEqual(result.baseCostCents);
  });

  it("applies Sunday penalty when shift falls on Sunday in venue TZ", () => {
    const result = computeShiftCost({
      startsAt: "2026-06-06T23:00:00.000Z",
      endsAt: "2026-06-07T04:00:00.000Z",
      breakMinutes: 0,
      hourlyRateCents: 2800,
      timezone: "Australia/Melbourne",
      employmentType: "casual",
      classificationGrade: "2",
    });
    expect(result.penaltyCostCents).toBeGreaterThan(0);
    expect(result.appliedRules.some((r) => r.includes("Sunday"))).toBe(true);
  });
});