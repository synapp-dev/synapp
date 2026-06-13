import type { RequestAuthContext } from "@/server/auth/context";
import {
  formatShiftClockInVenue,
  formatShiftDateInVenue,
  venueWeekRangeUtc,
} from "@/lib/roster/venue-time";
import { peopleService } from "@/server/workforce/people.service";
import { computeRosterWeekBudget, splhPlanned } from "@/server/workforce/roster-budget.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import {
  addDaysIso,
  dayIndexInWeek,
  ensureRosterWeek,
  loadAvailabilityHints,
  resolveVenueScope,
  shiftPaidHours,
  type RosterComplianceFlagDto,
  type RosterPositionDto,
  type RosterShiftDto,
  type RosterWeekPayload,
  type RosterWeekSummaryDto,
} from "@/server/workforce/roster-internal";

export async function getWeek(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    weekStart: string;
    lifecycle?: "published" | "draft" | "all";
  },
): Promise<RosterWeekPayload> {
  const context = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
  const weekEnd = addDaysIso(args.weekStart, 6);
  const tz = context.timezone;
  const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(args.weekStart, tz);
  const lifecycle = args.lifecycle ?? "all";

  const budget = await computeRosterWeekBudget(ctx.appDb, {
    venueId: context.venueId,
    weekStart: args.weekStart,
  });

  const weekId = await ensureRosterWeek(ctx, {
    organisationId: context.organisationId,
    venueId: context.venueId,
    weekStart: args.weekStart,
    budget,
  });

  const weekRow = await ctx.appDb.rls((tx) =>
    workforceRepo.getRosterWeek(tx, {
      venueId: context.venueId,
      weekStart: args.weekStart,
    }),
  );

  const positionRows = await ctx.appDb.rls((tx) =>
    workforceRepo.listPositionsForVenue(tx, context.venueId),
  );
  const positions: RosterPositionDto[] = positionRows.map((p) => ({
    id: p.id,
    slug: p.slug,
    displayName: p.displayName,
    sortOrder: p.sortOrder,
  }));
  const positionMeta = new Map(positions.map((p) => [p.id, p]));

  const { staff } = await peopleService.listForVenue(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
  });

  const shiftRows = await ctx.appDb.rls((tx) =>
    workforceRepo.listShiftsInRange(tx, {
      venueId: context.venueId,
      startUtc: startUtc.toISOString(),
      endExclusiveUtc: endExclusiveUtc.toISOString(),
      lifecycle,
    }),
  );

  const flagRows = await ctx.appDb.rls((tx) =>
    workforceRepo.listComplianceFlagsForShifts(
      tx,
      shiftRows.map((s) => s.id),
    ),
  );
  const flagsByShift = new Map<string, RosterComplianceFlagDto[]>();
  for (const f of flagRows) {
    const list = flagsByShift.get(f.shiftId) ?? [];
    list.push({
      rule: f.rule,
      tier: f.tier,
      message: f.message,
      overridden: f.overridden,
    });
    flagsByShift.set(f.shiftId, list);
  }

  const shifts: RosterShiftDto[] = shiftRows.map((row) => {
    const pos = positionMeta.get(row.positionId);
    const slug = pos?.slug ?? "unknown";
    const displayName = pos?.displayName ?? slug;
    const shiftDate = formatShiftDateInVenue(row.startsAt, tz);
    return {
      id: row.id,
      staffId: row.userProfileId,
      dayIndex: dayIndexInWeek(args.weekStart, shiftDate),
      shiftDate,
      start: formatShiftClockInVenue(row.startsAt, tz),
      end: formatShiftClockInVenue(row.endsAt, tz),
      positionId: row.positionId,
      positionSlug: slug,
      positionDisplayName: displayName,
      breakMins: row.breakMinutes,
      lifecycle: row.lifecycle,
      computedCostCents: row.computedCostCents,
      baseCostCents: row.baseCostCents,
      penaltyCostCents: row.penaltyCostCents,
      complianceFlags: flagsByShift.get(row.id) ?? [],
    };
  });

  const staffIds = staff.map((s) => s.id);
  const availability = await loadAvailabilityHints(ctx, {
    venueId: context.venueId,
    weekStart: args.weekStart,
    staffIds,
  });

  let totalHours = 0;
  for (const s of shifts) {
    const row = shiftRows.find((r) => r.id === s.id);
    if (!row) continue;
    totalHours += shiftPaidHours(row.startsAt, row.endsAt, s.breakMins);
  }

  const week: RosterWeekSummaryDto = {
    state: weekRow?.state ?? "draft",
    targetLabourPct: budget.targetLabourPct,
    forecastSalesCents: budget.forecastSalesCents,
    labourBudgetCents: budget.labourBudgetCents,
    totalCostCents: weekRow?.totalCostCents ?? shifts.reduce((a, s) => a + (s.computedCostCents ?? 0), 0),
    totalBaseCostCents: weekRow?.totalBaseCostCents ?? shifts.reduce((a, s) => a + (s.baseCostCents ?? 0), 0),
    totalPenaltyCostCents: weekRow?.totalPenaltyCostCents ?? shifts.reduce((a, s) => a + (s.penaltyCostCents ?? 0), 0),
    splhPlanned: splhPlanned(budget.forecastSalesCents, totalHours),
    forecastReady: budget.forecastReady,
    dailyForecast: budget.daily,
  };

  void weekId;

  return {
    weekStart: args.weekStart,
    weekEnd,
    week,
    positions,
    staff,
    shifts,
    availability,
  };
}
