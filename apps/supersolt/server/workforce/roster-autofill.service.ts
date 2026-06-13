import type { RequestAuthContext } from "@/server/auth/context";
import {
  formatShiftClockInVenue,
  formatShiftDateInVenue,
  venueWeekRangeUtc,
} from "@/lib/roster/venue-time";
import { computeRosterWeekBudget } from "@/server/workforce/roster-budget.service";
import { peopleService, PeopleServiceError } from "@/server/workforce/people.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import { createShift } from "@/server/workforce/roster-shift.service";
import {
  addDaysIso,
  buildAvailabilityMap,
  ensureRosterWeek,
  loadAvailabilityHints,
  resolveVenueScope,
} from "@/server/workforce/roster-internal";

export async function copyPreviousWeek(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    weekStart: string;
  },
): Promise<{ copied: number }> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );
  const tz = context.timezone;
  const prevStart = addDaysIso(args.weekStart, -7);
  const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(prevStart, tz);
  const targetRange = venueWeekRangeUtc(args.weekStart, tz);

  const prevShifts = await ctx.appDb.rls((tx) =>
    workforceRepo.listShiftsInRange(tx, {
      venueId: context.venueId,
      startUtc: startUtc.toISOString(),
      endExclusiveUtc: endExclusiveUtc.toISOString(),
      lifecycle: "all",
    }),
  );

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

  let copied = 0;
  for (const row of prevShifts) {
    if (!row.userProfileId) continue;
    const prevShiftDate = formatShiftDateInVenue(row.startsAt, tz);
    const shiftDate = addDaysIso(prevShiftDate, 7);
    const start = formatShiftClockInVenue(row.startsAt, tz);
    const end = formatShiftClockInVenue(row.endsAt, tz);
    try {
      await createShift(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        userProfileId: row.userProfileId,
        shiftDate,
        start,
        end,
        positionId: row.positionId,
        breakMinutes: row.breakMinutes,
        weekStart: args.weekStart,
      });
      copied += 1;
    } catch {
      // skip blocked copies
    }
  }

  void targetRange;
  void weekId;
  return { copied };
}

export async function autoBuildWeek(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    weekStart: string;
  },
): Promise<{ created: number; summary: string }> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );

  const { staff } = await peopleService.listForVenue(ctx, {
    organisationSlug: args.organisationSlug,
    venueSlug: args.venueSlug,
  });
  const availability = await loadAvailabilityHints(ctx, {
    venueId: context.venueId,
    weekStart: args.weekStart,
    staffIds: staff.map((s) => s.id),
  });
  const availMap = buildAvailabilityMap(availability);

  const positions = await ctx.appDb.rls((tx) =>
    workforceRepo.listPositionsForVenue(tx, context.venueId),
  );
  const defaultPositionId = positions[0]?.id;
  if (!defaultPositionId) {
    throw new PeopleServiceError(400, "Add positions before auto-build");
  }

  let created = 0;
  for (const member of staff) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const avail = availMap.get(member.id)?.get(dayIndex);
      if (avail === false) continue;

      const shiftDate = addDaysIso(args.weekStart, dayIndex);
      const positionId =
        positions.find((p) => p.slug === member.positionSlug)?.id ??
        defaultPositionId;

      try {
        await createShift(ctx, {
          organisationSlug: args.organisationSlug,
          venueSlug: args.venueSlug,
          userProfileId: member.id,
          shiftDate,
          start: "09:00",
          end: "17:00",
          positionId,
          breakMinutes: 30,
          weekStart: args.weekStart,
        });
        created += 1;
      } catch {
        // skip conflicts / compliance blocks
      }
    }
  }

  const budget = await computeRosterWeekBudget(ctx.appDb, {
    venueId: context.venueId,
    weekStart: args.weekStart,
  });

  return {
    created,
    summary: `Built ${created} draft shifts for week starting ${args.weekStart}. Target labour budget ${(budget.labourBudgetCents / 100).toFixed(0)} AUD.`,
  };
}
