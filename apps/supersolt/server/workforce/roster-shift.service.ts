import type { RequestAuthContext } from "@/server/auth/context";
import { computeRosterWeekBudget } from "@/server/workforce/roster-budget.service";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import {
  ensureRosterWeek,
  loadApprovedLeaveForWeek,
  loadAvailabilityHints,
  mapComplianceFlags,
  recalculateWeekTotals,
  resolveVenueScope,
  resolveWeekStart,
  validateAndPriceShift,
} from "@/server/workforce/roster-internal";

export async function createShift(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    userProfileId: string | null;
    shiftDate: string;
    start: string;
    end: string;
    positionId: string;
    breakMinutes: number;
    weekStart?: string;
    overrideReason?: string;
  },
): Promise<{ id: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.shiftDate)) {
    throw new PeopleServiceError(400, "shiftDate must be YYYY-MM-DD");
  }
  if (!Number.isFinite(args.breakMinutes) || args.breakMinutes < 0 || args.breakMinutes > 24 * 60) {
    throw new PeopleServiceError(400, "breakMinutes must be between 0 and 1440");
  }

  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );
  const tz = context.timezone;
  const weekStart = resolveWeekStart(args.shiftDate, tz, args.weekStart);

  const { staff } = await peopleService.listForVenue(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
  });
  const availability = await loadAvailabilityHints(ctx, {
    venueId: context.venueId,
    weekStart,
    staffIds: staff.map((s) => s.id),
  });
  const approvedLeave = await loadApprovedLeaveForWeek(ctx, {
    organisationId: context.organisationId,
    venueId: context.venueId,
    weekStart,
    staffIds: staff.map((s) => s.id),
  });

  const budget = await computeRosterWeekBudget(ctx.appDb, {
    venueId: context.venueId,
    weekStart,
  });
  const weekId = await ensureRosterWeek(ctx, {
    organisationId: context.organisationId,
    venueId: context.venueId,
    weekStart,
    budget,
  });

  const priced = await validateAndPriceShift(ctx, {
    context,
    input: {
      userProfileId: args.userProfileId,
      shiftDate: args.shiftDate,
      start: args.start,
      end: args.end,
      positionId: args.positionId,
      breakMinutes: args.breakMinutes,
      weekStart,
      overrideReason: args.overrideReason,
    },
    staff,
    availability,
    approvedLeave,
  });

  const id = await ctx.appDb.rls(async (tx) => {
    const shiftId = await workforceRepo.insertShift(tx, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      userProfileId: args.userProfileId,
      positionId: args.positionId,
      startsAt: priced.startsAt,
      endsAt: priced.endsAt,
      breakMinutes: args.breakMinutes,
      lifecycle: "draft",
      source: "manual",
      rosterWeekId: weekId,
      awardCode: priced.cost.awardCode,
      computedCostCents: priced.cost.computedCostCents,
      baseCostCents: priced.cost.baseCostCents,
      penaltyCostCents: priced.cost.penaltyCostCents,
    });
    await workforceRepo.replaceComplianceFlags(tx, {
      shiftId,
      flags: mapComplianceFlags(
        priced.flags,
        args.overrideReason,
        ctx.userId,
      ),
    });
    return shiftId;
  });

  await recalculateWeekTotals(ctx, {
    venueId: context.venueId,
    weekStart,
    weekId,
    timezone: tz,
  });

  return { id };
}

export async function updateShift(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    shiftId: string;
    userProfileId: string | null;
    shiftDate: string;
    start: string;
    end: string;
    positionId: string;
    breakMinutes: number;
    weekStart?: string;
    overrideReason?: string;
  },
): Promise<{ id: string }> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );

  const existing = await ctx.appDb.rls((tx) =>
    workforceRepo.getShiftForVenue(tx, {
      shiftId: args.shiftId,
      venueId: context.venueId,
    }),
  );
  if (!existing) {
    throw new PeopleServiceError(404, "Shift not found");
  }

  const tz = context.timezone;
  const weekStart = resolveWeekStart(args.shiftDate, tz, args.weekStart);

  const { staff } = await peopleService.listForVenue(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
  });
  const availability = await loadAvailabilityHints(ctx, {
    venueId: context.venueId,
    weekStart,
    staffIds: staff.map((s) => s.id),
  });
  const approvedLeave = await loadApprovedLeaveForWeek(ctx, {
    organisationId: context.organisationId,
    venueId: context.venueId,
    weekStart,
    staffIds: staff.map((s) => s.id),
  });

  const priced = await validateAndPriceShift(ctx, {
    context,
    input: {
      userProfileId: args.userProfileId,
      shiftDate: args.shiftDate,
      start: args.start,
      end: args.end,
      positionId: args.positionId,
      breakMinutes: args.breakMinutes,
      weekStart,
      overrideReason: args.overrideReason,
    },
    staff,
    availability,
    approvedLeave,
    excludeShiftId: args.shiftId,
  });

  const lifecycle =
    existing.lifecycle === "published" ? "modified" : existing.lifecycle;

  const updatedId = await ctx.appDb.rls(async (tx) => {
    const id = await workforceRepo.updateShift(tx, {
      shiftId: args.shiftId,
      venueId: context.venueId,
      row: {
        userProfileId: args.userProfileId,
        positionId: args.positionId,
        startsAt: priced.startsAt,
        endsAt: priced.endsAt,
        breakMinutes: args.breakMinutes,
        awardCode: priced.cost.awardCode,
        computedCostCents: priced.cost.computedCostCents,
        baseCostCents: priced.cost.baseCostCents,
        penaltyCostCents: priced.cost.penaltyCostCents,
        lifecycle,
      },
    });
    if (id) {
      await workforceRepo.replaceComplianceFlags(tx, {
        shiftId: id,
        flags: mapComplianceFlags(
          priced.flags,
          args.overrideReason,
          ctx.userId,
        ),
      });
    }
    return id;
  });

  if (!updatedId) {
    throw new PeopleServiceError(404, "Shift not found");
  }

  const weekId =
    existing.rosterWeekId ??
    (await ensureRosterWeek(ctx, {
      organisationId: context.organisationId,
      venueId: context.venueId,
      weekStart,
      budget: await computeRosterWeekBudget(ctx.appDb, {
        venueId: context.venueId,
        weekStart,
      }),
    }));

  await recalculateWeekTotals(ctx, {
    venueId: context.venueId,
    weekStart,
    weekId,
    timezone: tz,
  });

  return { id: updatedId };
}

export async function deleteShift(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    shiftId: string;
    weekStart: string;
  },
): Promise<{ id: string }> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );

  const deletedId = await ctx.appDb.rls((tx) =>
    workforceRepo.deleteShift(tx, {
      shiftId: args.shiftId,
      venueId: context.venueId,
    }),
  );
  if (!deletedId) {
    throw new PeopleServiceError(404, "Shift not found");
  }

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

  await recalculateWeekTotals(ctx, {
    venueId: context.venueId,
    weekStart: args.weekStart,
    weekId,
    timezone: context.timezone,
  });

  return { id: deletedId };
}
