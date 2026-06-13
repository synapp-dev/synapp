import type { RequestAuthContext } from "@/server/auth/context";
import { AuthError } from "@/server/auth/errors";
import {
  mondayOfIsoWeekContainingCalendarDay,
  shiftBoundsUtc,
  venueCalendarDayBoundsUtc,
  venueWeekRangeUtc,
} from "@/lib/roster/venue-time";
import type { shiftComplianceFlags, rosterShifts } from "@/server/db/schema";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import { assertVenueRosterEditor } from "@/server/workforce/roster-access";
import {
  requireVenueScope,
  rethrowVenueScopeError,
} from "@/server/access/require-venue-scope";
import {
  computeRosterWeekBudget,
  splhPlanned,
} from "@/server/workforce/roster-budget.service";
import {
  DEFAULT_AWARD_CODE,
  fallbackHourlyRateCents,
} from "@/server/workforce/roster-cost.service";
import { awardService } from "@/server/workforce/award/award.service";
import {
  evaluateShiftCompliance,
  hasHardBlock,
  unresolvedWarnFlags,
  type ShiftComplianceFlag,
} from "@/server/workforce/roster-compliance.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import { dateInRange } from "@/server/workforce/leave-policy";
import { leaveRepo } from "@/server/workforce/leave.repo";
import {
  isVenueStaffWeeklyAvailabilityTableMissing,
  isVenueStaffWeekInstanceAvailabilityTableMissing,
} from "@/server/workforce/venue-staff-weekly-availability-schema";

export type RosterPositionDto = {
  id: string;
  slug: string;
  displayName: string;
  sortOrder: number;
};

export type RosterComplianceFlagDto = {
  rule: string;
  tier: "hard_block" | "warn";
  message: string;
  overridden: boolean;
};

export type RosterShiftDto = {
  id: string;
  staffId: string | null;
  dayIndex: number;
  shiftDate: string;
  start: string;
  end: string;
  positionId: string;
  positionSlug: string;
  positionDisplayName: string;
  breakMins: number;
  lifecycle: (typeof rosterShifts.$inferSelect)["lifecycle"];
  computedCostCents: number | null;
  baseCostCents: number | null;
  penaltyCostCents: number | null;
  complianceFlags: RosterComplianceFlagDto[];
};

export type RosterAvailabilityHintDto = {
  staffId: string;
  dayIndex: number;
  available: boolean;
};

export type RosterWeekSummaryDto = {
  state: string;
  targetLabourPct: number;
  forecastSalesCents: number;
  labourBudgetCents: number;
  totalCostCents: number;
  totalBaseCostCents: number;
  totalPenaltyCostCents: number;
  splhPlanned: number | null;
  forecastReady: boolean;
  dailyForecast: Array<{
    date: string;
    revenueCents: number;
    labourBudgetCents: number;
  }>;
};

export type RosterWeekPayload = {
  weekStart: string;
  weekEnd: string;
  week: RosterWeekSummaryDto;
  positions: RosterPositionDto[];
  staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"];
  shifts: RosterShiftDto[];
  availability: RosterAvailabilityHintDto[];
};

export type ShiftInput = {
  userProfileId: string | null;
  shiftDate: string;
  start: string;
  end: string;
  positionId: string;
  breakMinutes: number;
  weekStart: string;
  overrideReason?: string;
};

export type ApprovedLeaveRange = {
  userProfileId: string;
  startDate: string;
  endDate: string;
};

export function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new PeopleServiceError(error.status, error.message);
  }
  throw error;
}

export function dbErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unknown database error";
}

export function dbErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: string }).code);
  }
  return undefined;
}

export function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function normalizeShiftHms(t: string): string {
  const s = t.trim();
  const parts = s.split(":").map((x) => x.trim());
  const h = parts[0] ?? "0";
  const m = parts[1] ?? "00";
  const sec = parts[2] ?? "00";
  if (!/^\d{1,2}$/.test(h) || !/^\d{1,2}$/.test(m)) {
    throw new PeopleServiceError(400, "start and end must be HH:mm or HH:mm:ss");
  }
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${sec.padStart(2, "0")}`;
}

export function dayIndexInWeek(weekStart: string, shiftDate: string): number {
  const p1 = weekStart.split("-").map(Number);
  const p2 = shiftDate.split("-").map(Number);
  const a = Date.UTC(p1[0] ?? 0, (p1[1] ?? 1) - 1, p1[2] ?? 1);
  const b = Date.UTC(p2[0] ?? 0, (p2[1] ?? 1) - 1, p2[2] ?? 1);
  return Math.round((b - a) / 86400000);
}

export function resolveWeekStart(shiftDate: string, timezone: string, weekStart?: string): string {
  return weekStart ?? mondayOfIsoWeekContainingCalendarDay(shiftDate, timezone);
}

export function shiftPaidHours(startsAt: string, endsAt: string, breakMinutes: number): number {
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (endMs <= startMs) return 0;
  return Math.max(0, (endMs - startMs) / 3600000 - breakMinutes / 60);
}

export function buildAvailabilityMap(hints: RosterAvailabilityHintDto[]) {
  const map = new Map<string, Map<number, boolean>>();
  for (const h of hints) {
    if (!map.has(h.staffId)) map.set(h.staffId, new Map());
    map.get(h.staffId)!.set(h.dayIndex, h.available);
  }
  return map;
}

export function isStaffOnApprovedLeave(
  staffId: string | null,
  shiftDate: string,
  ranges: ApprovedLeaveRange[],
): boolean {
  if (!staffId) return false;
  return ranges.some(
    (r) => r.userProfileId === staffId && dateInRange(shiftDate, r.startDate, r.endDate),
  );
}

export async function loadApprovedLeaveForWeek(
  ctx: RequestAuthContext,
  args: {
    organisationId: string;
    venueId: string;
    weekStart: string;
    staffIds: string[];
  },
): Promise<ApprovedLeaveRange[]> {
  if (args.staffIds.length === 0) return [];
  const weekEnd = addDaysIso(args.weekStart, 6);
  try {
    return await ctx.appDb.rls((tx) =>
      leaveRepo.listApprovedLeaveRanges(tx, {
        organisationId: args.organisationId,
        venueId: args.venueId,
        userProfileIds: args.staffIds,
        from: args.weekStart,
        to: weekEnd,
      }),
    );
  } catch {
    return [];
  }
}

export function staffNameById(
  staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"],
  staffId: string | null,
): string {
  if (!staffId) return "Open shift";
  return staff.find((s) => s.id === staffId)?.name ?? "Staff member";
}

export async function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
  requireEditor = false,
) {
  try {
    const scope = await requireVenueScope(ctx, organisationSlug, venueSlug);
    if (requireEditor) {
      assertVenueRosterEditor(ctx.tenantRoles, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
    }
    return scope;
  } catch (error) {
    rethrowVenueScopeError(error, {
      notFound: (message) => new PeopleServiceError(404, message),
      forbidden: (auth) => new PeopleServiceError(auth.status, auth.message),
    });
  }
}

export async function loadAvailabilityHints(
  ctx: RequestAuthContext,
  args: {
    venueId: string;
    weekStart: string;
    staffIds: string[];
  },
): Promise<RosterAvailabilityHintDto[]> {
  if (args.staffIds.length === 0) return [];
  try {
    const { instRows, recRows } = await ctx.appDb.rls((tx) =>
      workforceRepo.listAvailabilityHintsForWeek(tx, {
        venueId: args.venueId,
        weekStartMonday: args.weekStart,
        staffIds: args.staffIds,
      }),
    );

    const weekByStaff = new Map<string, Map<number, boolean>>();
    for (const r of instRows) {
      if (!weekByStaff.has(r.userProfileId)) weekByStaff.set(r.userProfileId, new Map());
      weekByStaff.get(r.userProfileId)!.set(r.dayOfWeek, r.isAvailable);
    }
    const recByStaff = new Map<string, Map<number, boolean>>();
    for (const r of recRows) {
      if (!recByStaff.has(r.userProfileId)) recByStaff.set(r.userProfileId, new Map());
      recByStaff.get(r.userProfileId)!.set(r.dayOfWeek, r.isAvailable);
    }

    const availability: RosterAvailabilityHintDto[] = [];
    for (const sid of args.staffIds) {
      for (let d = 0; d < 7; d += 1) {
        const w = weekByStaff.get(sid)?.get(d);
        const t = recByStaff.get(sid)?.get(d);
        const effective = w !== undefined ? w : t;
        if (effective === true) {
          availability.push({ staffId: sid, dayIndex: d, available: true });
        } else if (effective === false) {
          availability.push({ staffId: sid, dayIndex: d, available: false });
        }
      }
    }
    return availability;
  } catch (error) {
    const err = { message: dbErrorMessage(error), code: dbErrorCode(error) };
    if (
      !isVenueStaffWeekInstanceAvailabilityTableMissing(err) &&
      !isVenueStaffWeeklyAvailabilityTableMissing(err)
    ) {
      throw new PeopleServiceError(500, dbErrorMessage(error));
    }
    return [];
  }
}

export async function ensureRosterWeek(
  ctx: RequestAuthContext,
  args: {
    organisationId: string;
    venueId: string;
    weekStart: string;
    budget: Awaited<ReturnType<typeof computeRosterWeekBudget>>;
  },
) {
  return ctx.appDb.rls((tx) =>
    workforceRepo.getOrCreateRosterWeek(tx, {
      organisationId: args.organisationId,
      venueId: args.venueId,
      weekStart: args.weekStart,
      state: "draft",
      targetLabourPct: String(args.budget.targetLabourPct),
      forecastSalesCents: args.budget.forecastSalesCents,
      labourBudgetCents: args.budget.labourBudgetCents,
    }),
  );
}

export async function recalculateWeekTotals(
  ctx: RequestAuthContext,
  args: {
    venueId: string;
    weekStart: string;
    weekId: string;
    timezone: string;
  },
) {
  const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(args.weekStart, args.timezone);
  const shiftRows = await ctx.appDb.rls((tx) =>
    workforceRepo.listShiftsInRange(tx, {
      venueId: args.venueId,
      startUtc: startUtc.toISOString(),
      endExclusiveUtc: endExclusiveUtc.toISOString(),
      lifecycle: "all",
    }),
  );

  let totalCost = 0;
  let totalBase = 0;
  let totalPenalty = 0;
  let totalHours = 0;
  for (const row of shiftRows) {
    totalCost += row.computedCostCents ?? 0;
    totalBase += row.baseCostCents ?? 0;
    totalPenalty += row.penaltyCostCents ?? 0;
    totalHours += shiftPaidHours(row.startsAt, row.endsAt, row.breakMinutes);
  }

  const budget = await computeRosterWeekBudget(ctx.appDb, {
    venueId: args.venueId,
    weekStart: args.weekStart,
  });

  await ctx.appDb.rls((tx) =>
    workforceRepo.updateRosterWeek(tx, {
      weekId: args.weekId,
      venueId: args.venueId,
      patch: {
        totalCostCents: totalCost,
        totalBaseCostCents: totalBase,
        totalPenaltyCostCents: totalPenalty,
        splhPlanned: splhPlanned(budget.forecastSalesCents, totalHours)?.toFixed(4) ?? null,
        forecastSalesCents: budget.forecastSalesCents,
        labourBudgetCents: budget.labourBudgetCents,
        targetLabourPct: String(budget.targetLabourPct),
      },
    }),
  );
}

export async function validateAndPriceShift(
  ctx: RequestAuthContext,
  args: {
    context: Awaited<ReturnType<typeof resolveVenueScope>>;
    input: ShiftInput;
    staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"];
    availability: RosterAvailabilityHintDto[];
    approvedLeave: ApprovedLeaveRange[];
    excludeShiftId?: string;
  },
) {
  const { context, input } = args;
  const tz = context.timezone;
  const startHms = normalizeShiftHms(input.start);
  const endHms = normalizeShiftHms(input.end);
  const { startsAt, endsAt } = shiftBoundsUtc(input.shiftDate, startHms, endHms, tz);

  if (input.userProfileId) {
    const { dayStartUtc, dayEndExclusiveUtc } = venueCalendarDayBoundsUtc(
      input.shiftDate,
      tz,
    );
    const overlap = await ctx.appDb.rls((tx) =>
      workforceRepo.findOverlappingShift(tx, {
        venueId: context.venueId,
        userProfileId: input.userProfileId,
        dayStartUtc: dayStartUtc.toISOString(),
        dayEndExclusiveUtc: dayEndExclusiveUtc.toISOString(),
        excludeShiftId: args.excludeShiftId,
      }),
    );
    if (overlap) {
      throw new PeopleServiceError(409, "This staff member already has a shift on that day");
    }
  }

  const dayIndex = dayIndexInWeek(input.weekStart, input.shiftDate);
  const availMap = buildAvailabilityMap(args.availability);
  const staffAvail = input.userProfileId
    ? availMap.get(input.userProfileId)?.get(dayIndex)
    : undefined;

  const weekRange = venueWeekRangeUtc(input.weekStart, tz);
  const weekShifts = input.userProfileId
    ? await ctx.appDb.rls((tx) =>
        workforceRepo.listShiftsForStaffInRange(tx, {
          venueId: context.venueId,
          staffId: input.userProfileId!,
          startUtc: weekRange.startUtc.toISOString(),
          endExclusiveUtc: weekRange.endExclusiveUtc.toISOString(),
          excludeShiftId: args.excludeShiftId,
        }),
      )
    : [];

  let weeklyHours = 0;
  for (const s of weekShifts) {
    weeklyHours += shiftPaidHours(s.startsAt, s.endsAt, 0);
  }

  const budget = await computeRosterWeekBudget(ctx.appDb, {
    venueId: context.venueId,
    weekStart: input.weekStart,
  });

  const flags = evaluateShiftCompliance(
    {
      staffId: input.userProfileId,
      staffName: staffNameById(args.staff, input.userProfileId),
      shiftDate: input.shiftDate,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      breakMinutes: input.breakMinutes,
      dayIndex,
      availabilityKnown: staffAvail !== undefined,
      isAvailable: staffAvail ?? true,
      onApprovedLeave: isStaffOnApprovedLeave(
        input.userProfileId,
        input.shiftDate,
        args.approvedLeave,
      ),
    },
    {
      existingShifts: weekShifts.map((s) => ({
        staffId: input.userProfileId!,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        excludeShiftId: args.excludeShiftId,
      })),
      weeklyHoursByStaff: new Map([[input.userProfileId ?? "", weeklyHours]]),
      dayCostCents: 0,
      labourBudgetCents: budget.labourBudgetCents,
    },
  );

  if (hasHardBlock(flags)) {
    const msg = flags.find((f) => f.tier === "hard_block")?.message ?? "Shift blocked by compliance rules";
    throw new PeopleServiceError(422, msg);
  }

  const pendingWarns = unresolvedWarnFlags(flags, input.overrideReason);
  if (pendingWarns.length > 0) {
    throw new PeopleServiceError(
      422,
      `${pendingWarns[0]?.message ?? "Compliance warning"} — provide overrideReason to proceed.`,
    );
  }

  const hourlyRate = input.userProfileId
    ? fallbackHourlyRateCents(input.userProfileId)
    : 0;
  const cost =
    hourlyRate > 0
      ? await awardService.computeShiftCost(ctx, {
          awardCode: DEFAULT_AWARD_CODE,
          classificationGrade: "2",
          employmentType: "casual",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          breakMinutes: input.breakMinutes,
          hourlyRateCents: hourlyRate,
          timezone: tz,
          asOfDate: input.shiftDate,
        })
      : {
          awardCode: DEFAULT_AWARD_CODE,
          computedCostCents: 0,
          baseCostCents: 0,
          penaltyCostCents: 0,
          paidHours: 0,
          appliedRules: [],
        };

  return {
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    flags,
    cost,
  };
}

export function mapComplianceFlags(
  flags: ShiftComplianceFlag[],
  overrideReason?: string,
  overrideBy?: string,
): Array<{
  rule: (typeof shiftComplianceFlags.$inferInsert)["rule"];
  tier: (typeof shiftComplianceFlags.$inferInsert)["tier"];
  message: string;
  overridden: boolean;
  overrideReason?: string | null;
  overrideBy?: string | null;
  overrideAt?: string | null;
}> {
  const now = new Date().toISOString();
  return flags.map((f) => ({
    rule: f.rule,
    tier: f.tier,
    message: f.message,
    overridden: f.tier === "warn" && Boolean(overrideReason?.trim()),
    overrideReason: f.tier === "warn" ? overrideReason?.trim() ?? null : null,
    overrideBy: f.tier === "warn" && overrideReason?.trim() ? overrideBy ?? null : null,
    overrideAt: f.tier === "warn" && overrideReason?.trim() ? now : null,
  }));
}
