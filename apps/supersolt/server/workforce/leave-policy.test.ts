import { describe, expect, it } from "vitest";
import {
  computeLeaveHours,
  countCalendarDays,
  lslBalanceHours,
  requiresOwnerApproval,
  maskCalendarLabel,
} from "@/server/workforce/leave-policy";

describe("leave-policy", () => {
  it("computes full-day leave hours", () => {
    expect(computeLeaveHours({ startDate: "2026-07-14", endDate: "2026-07-18" })).toBe(38);
  });

  it("counts calendar days inclusive", () => {
    expect(countCalendarDays("2026-07-14", "2026-07-14")).toBe(1);
    expect(countCalendarDays("2026-07-14", "2026-07-18")).toBe(5);
  });

  it("requires owner approval for long blocks", () => {
    expect(
      requiresOwnerApproval({
        startDate: "2026-07-01",
        endDate: "2026-07-10",
        leaveTypeDefaultRole: "manager",
        orgMinDaysForOwner: 5,
      }),
    ).toBe(true);
  });

  it("calculates VIC LSL balance at 7 years", () => {
    const hours = lslBalanceHours({
      yearsOfService: 7,
      stateAccrualWeeksPerYear: 1.43,
      minYears: 7,
    });
    expect(hours).toBeGreaterThan(0);
  });

  it("masks private leave labels", () => {
    expect(maskCalendarLabel(true, "DFV leave")).toBe("Leave (private)");
    expect(maskCalendarLabel(false, "Annual leave")).toBe("Annual leave");
  });
});
