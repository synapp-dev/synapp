import { beforeEach, describe, expect, it, vi } from "vitest";

import { createShift } from "@/server/workforce/roster-shift.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import { computeRosterWeekBudget } from "@/server/workforce/roster-budget.service";
import {
  ensureRosterWeek,
  loadApprovedLeaveForWeek,
  loadAvailabilityHints,
  recalculateWeekTotals,
  resolveVenueScope,
  validateAndPriceShift,
} from "@/server/workforce/roster-internal";

vi.mock("@/server/workforce/workforce.repo", () => ({
  workforceRepo: {
    insertShift: vi.fn(),
    replaceComplianceFlags: vi.fn(),
  },
}));

vi.mock("@/server/workforce/people.service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/workforce/people.service")>();
  return {
    ...original,
    peopleService: {
      ...original.peopleService,
      listForVenue: vi.fn(),
    },
  };
});

vi.mock("@/server/workforce/roster-budget.service", () => ({
  computeRosterWeekBudget: vi.fn(),
}));

vi.mock("@/server/workforce/roster-internal", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/workforce/roster-internal")>();
  return {
    ...original,
    ensureRosterWeek: vi.fn(),
    loadApprovedLeaveForWeek: vi.fn(),
    loadAvailabilityHints: vi.fn(),
    recalculateWeekTotals: vi.fn(),
    resolveVenueScope: vi.fn(),
    validateAndPriceShift: vi.fn(),
  };
});

function makeCtx() {
  return {
    userId: "user-1",
    appDb: {
      rls: vi.fn(async (callback: (tx: unknown) => unknown) => callback({})),
    },
  } as any;
}

describe("createShift", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveVenueScope).mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "Australia/Melbourne",
    } as any);
    vi.mocked(peopleService.listForVenue).mockResolvedValue({
      staff: [{ id: "staff-1", name: "Alex" }],
    } as any);
    vi.mocked(loadAvailabilityHints).mockResolvedValue([]);
    vi.mocked(loadApprovedLeaveForWeek).mockResolvedValue([]);
    vi.mocked(computeRosterWeekBudget).mockResolvedValue({
      targetLabourPct: 25,
      forecastSalesCents: 100_000,
      labourBudgetCents: 25_000,
      forecastReady: true,
      daily: [],
    } as any);
    vi.mocked(ensureRosterWeek).mockResolvedValue("week-1");
    vi.mocked(workforceRepo.insertShift).mockResolvedValue("shift-1" as any);
    vi.mocked(workforceRepo.replaceComplianceFlags).mockResolvedValue(undefined as any);
    vi.mocked(recalculateWeekTotals).mockResolvedValue(undefined as any);
  });

  it("bubbles hard-block validation errors and skips persistence", async () => {
    vi.mocked(validateAndPriceShift).mockRejectedValue(
      new PeopleServiceError(422, "Shift blocked by compliance rules"),
    );

    await expect(
      createShift(makeCtx(), {
        organisationSlug: "org",
        venueSlug: "venue",
        userProfileId: "staff-1",
        shiftDate: "2026-06-01",
        start: "09:00",
        end: "17:00",
        positionId: "pos-1",
        breakMinutes: 30,
      }),
    ).rejects.toMatchObject({ status: 422 });

    expect(workforceRepo.insertShift).not.toHaveBeenCalled();
    expect(workforceRepo.replaceComplianceFlags).not.toHaveBeenCalled();
  });

  it("persists warn flags as overridden when override reason is supplied", async () => {
    vi.mocked(validateAndPriceShift).mockResolvedValue({
      startsAt: "2026-06-01T23:00:00.000Z",
      endsAt: "2026-06-02T07:00:00.000Z",
      flags: [
        {
          rule: "rest_gap",
          tier: "warn",
          message: "Rest gap under 10 hours",
        },
      ],
      cost: {
        awardCode: "HIGA",
        computedCostCents: 1000,
        baseCostCents: 900,
        penaltyCostCents: 100,
      },
    } as any);

    await createShift(makeCtx(), {
      organisationSlug: "org",
      venueSlug: "venue",
      userProfileId: "staff-1",
      shiftDate: "2026-06-01",
      start: "09:00",
      end: "17:00",
      positionId: "pos-1",
      breakMinutes: 30,
      overrideReason: "Manager approved",
    });

    expect(workforceRepo.insertShift).toHaveBeenCalledTimes(1);
    expect(workforceRepo.replaceComplianceFlags).toHaveBeenCalledTimes(1);
    expect(workforceRepo.replaceComplianceFlags).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        shiftId: "shift-1",
        flags: [
          expect.objectContaining({
            rule: "rest_gap",
            tier: "warn",
            overridden: true,
            overrideReason: "Manager approved",
            overrideBy: "user-1",
          }),
        ],
      }),
    );
  });
});
