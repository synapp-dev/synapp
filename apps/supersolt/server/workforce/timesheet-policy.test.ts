import { describe, expect, it } from "vitest";

import {
  classifyVarianceTier,
  computeHoursFromTimestamps,
  computeRosteredHours,
  computeVarianceMinutes,
  computeWeeklyOtHours,
  payPeriodBoundsForDate,
  requiresOwnerApprovalForVariance,
  validateGeolocation,
} from "@/server/workforce/timesheet-policy";

describe("timesheet-policy", () => {
  it("computeRosteredHours subtracts unpaid breaks", () => {
    const hours = computeRosteredHours("2026-06-01T08:00:00+10:00", "2026-06-01T16:00:00+10:00", 30);
    expect(hours).toBe(7.5);
  });

  it("computeVariance within tolerance is green", () => {
    const tier = classifyVarianceTier({
      startVarianceMin: 3,
      endVarianceMin: -2,
      hoursVariance: 0,
      hasClockData: true,
      toleranceMin: 5,
    });
    expect(tier).toBe("green");
  });

  it("no clock data is black tier", () => {
    const tier = classifyVarianceTier({
      startVarianceMin: null,
      endVarianceMin: null,
      hoursVariance: null,
      hasClockData: false,
      toleranceMin: 5,
    });
    expect(tier).toBe("black");
  });

  it("requires owner approval above threshold", () => {
    expect(
      requiresOwnerApprovalForVariance(130, 0, 0, 120),
    ).toBe(true);
    expect(
      requiresOwnerApprovalForVariance(10, 0, 0, 120),
    ).toBe(false);
  });

  it("fortnightly pay period boundaries", () => {
    const bounds = payPeriodBoundsForDate({
      date: "2026-06-04",
      frequency: "fortnightly",
      startDow: 1,
    });
    expect(bounds.startDate).toBe("2026-06-02");
    expect(bounds.endDate).toBe("2026-06-15");
  });

  it("computeWeeklyOtHours over 38", () => {
    expect(computeWeeklyOtHours(42)).toBe(4);
  });

  it("validateGeolocation flags remote clock", () => {
    const result = validateGeolocation({
      staffLat: -37.8136,
      staffLng: 144.9631,
      venueLat: -37.8136,
      venueLng: 144.9631,
      radiusM: 100,
    });
    expect(result.flagged).toBe(false);

    const remote = validateGeolocation({
      staffLat: -37.9,
      staffLng: 145.1,
      venueLat: -37.8136,
      venueLng: 144.9631,
      radiusM: 100,
    });
    expect(remote.flagged).toBe(true);
  });

  it("computeVarianceMinutes late start", () => {
    const mins = computeVarianceMinutes(
      "2026-06-01T08:15:00+10:00",
      "2026-06-01T08:00:00+10:00",
    );
    expect(mins).toBe(15);
  });

  it("computeHoursFromTimestamps", () => {
    const h = computeHoursFromTimestamps(
      "2026-06-01T08:00:00+10:00",
      "2026-06-01T16:00:00+10:00",
      30,
    );
    expect(h).toBe(7.5);
  });
});
