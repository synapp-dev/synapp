import { beforeEach, describe, expect, it, vi } from "vitest";

import { publishWeek } from "@/server/workforce/roster-publish.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import { computeRosterWeekBudget } from "@/server/workforce/roster-budget.service";
import { buildTimesheetBaselineFromShift, ensurePayPeriodInTx } from "@/server/workforce/timesheet.service";
import { ensureRosterWeek, resolveVenueScope } from "@/server/workforce/roster-internal";

vi.mock("@/server/workforce/workforce.repo", () => ({
  workforceRepo: {
    listShiftsInRange: vi.fn(),
    updateShift: vi.fn(),
    insertTimesheetBaseline: vi.fn(),
    queuePublishDelivery: vi.fn(),
    updateRosterWeek: vi.fn(),
  },
}));

vi.mock("@/server/workforce/roster-budget.service", () => ({
  computeRosterWeekBudget: vi.fn(),
}));

vi.mock("@/server/workforce/timesheet.service", () => ({
  ensurePayPeriodInTx: vi.fn(),
  buildTimesheetBaselineFromShift: vi.fn(),
}));

vi.mock("@/server/workforce/roster-internal", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/workforce/roster-internal")>();
  return {
    ...original,
    ensureRosterWeek: vi.fn(),
    resolveVenueScope: vi.fn(),
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

describe("publishWeek", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveVenueScope).mockResolvedValue({
      organisationId: "org-1",
      venueId: "venue-1",
      timezone: "Australia/Melbourne",
    } as any);
    vi.mocked(computeRosterWeekBudget).mockResolvedValue({
      targetLabourPct: 25,
      forecastSalesCents: 100_000,
      labourBudgetCents: 25_000,
      forecastReady: true,
      daily: [],
    } as any);
    vi.mocked(ensureRosterWeek).mockResolvedValue("week-1");
    vi.mocked(ensurePayPeriodInTx).mockResolvedValue({ id: "period-1" } as any);
    vi.mocked(buildTimesheetBaselineFromShift).mockReturnValue({ id: "baseline-1" } as any);
    vi.mocked(workforceRepo.updateShift).mockResolvedValue("shift-1" as any);
    vi.mocked(workforceRepo.insertTimesheetBaseline).mockResolvedValue(undefined as any);
    vi.mocked(workforceRepo.queuePublishDelivery).mockResolvedValue(undefined as any);
    vi.mocked(workforceRepo.updateRosterWeek).mockResolvedValue(undefined as any);
  });

  it("publishes draft/modified shifts and queues timesheet + delivery records", async () => {
    vi.mocked(workforceRepo.listShiftsInRange).mockResolvedValue([
      {
        id: "shift-1",
        lifecycle: "draft",
        userProfileId: "staff-1",
        positionId: "pos-1",
        startsAt: "2026-06-01T23:00:00.000Z",
        endsAt: "2026-06-02T07:00:00.000Z",
        breakMinutes: 30,
      },
      {
        id: "shift-2",
        lifecycle: "published",
        userProfileId: "staff-2",
        positionId: "pos-1",
        startsAt: "2026-06-02T23:00:00.000Z",
        endsAt: "2026-06-03T07:00:00.000Z",
        breakMinutes: 30,
      },
    ] as any);

    const result = await publishWeek(makeCtx(), {
      organisationSlug: "org",
      venueSlug: "venue",
      weekStart: "2026-06-01",
    });

    expect(result).toEqual({ published: 1, deliveriesQueued: 3 });
    expect(workforceRepo.updateShift).toHaveBeenCalledTimes(1);
    expect(workforceRepo.insertTimesheetBaseline).toHaveBeenCalledTimes(1);
    expect(workforceRepo.queuePublishDelivery).toHaveBeenCalledTimes(2);
    expect(workforceRepo.updateRosterWeek).toHaveBeenCalledTimes(1);
  });
});
