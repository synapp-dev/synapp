import { describe, expect, it } from "vitest";
import {
  evaluateShiftCompliance,
  hasHardBlock,
  unresolvedWarnFlags,
} from "@/server/workforce/roster-compliance.service";

describe("roster-compliance", () => {
  it("hard-blocks when staff is on approved leave", () => {
    const flags = evaluateShiftCompliance(
      {
        staffId: "staff-1",
        staffName: "Alex",
        shiftDate: "2026-06-03",
        startsAt: "2026-06-03T00:00:00.000Z",
        endsAt: "2026-06-03T08:00:00.000Z",
        breakMinutes: 30,
        dayIndex: 2,
        availabilityKnown: true,
        isAvailable: true,
        onApprovedLeave: true,
      },
      {
        existingShifts: [],
        weeklyHoursByStaff: new Map(),
        dayCostCents: 0,
        labourBudgetCents: 100000,
      },
    );
    expect(hasHardBlock(flags)).toBe(true);
  });

  it("requires override for rest gap warnings", () => {
    const flags = evaluateShiftCompliance(
      {
        staffId: "staff-1",
        staffName: "Alex",
        shiftDate: "2026-06-06",
        startsAt: "2026-06-06T08:00:00.000Z",
        endsAt: "2026-06-06T16:00:00.000Z",
        breakMinutes: 0,
        dayIndex: 5,
        availabilityKnown: true,
        isAvailable: true,
        onApprovedLeave: false,
      },
      {
        existingShifts: [
          {
            staffId: "staff-1",
            startsAt: "2026-06-05T12:00:00.000Z",
            endsAt: "2026-06-05T23:00:00.000Z",
          },
        ],
        weeklyHoursByStaff: new Map([["staff-1", 8]]),
        dayCostCents: 0,
        labourBudgetCents: 100000,
      },
    );
    expect(flags.some((f) => f.rule === "rest_gap")).toBe(true);
    expect(unresolvedWarnFlags(flags, undefined).length).toBeGreaterThan(0);
    expect(unresolvedWarnFlags(flags, "Manager approved").length).toBe(0);
  });
});
