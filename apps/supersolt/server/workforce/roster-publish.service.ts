import type { RequestAuthContext } from "@/server/auth/context";
import { venueWeekRangeUtc } from "@/lib/roster/venue-time";
import { computeRosterWeekBudget } from "@/server/workforce/roster-budget.service";
import {
  buildTimesheetBaselineFromShift,
  ensurePayPeriodInTx,
} from "@/server/workforce/timesheet.service";
import { workforceRepo } from "@/server/workforce/workforce.repo";
import { PeopleServiceError } from "@/server/workforce/people.service";
import { ensureRosterWeek, resolveVenueScope } from "@/server/workforce/roster-internal";

export async function publishWeek(
  ctx: RequestAuthContext,
  args: {
    organisationSlug: string;
    venueSlug: string;
    weekStart: string;
  },
): Promise<{ published: number; deliveriesQueued: number }> {
  const context = await resolveVenueScope(
    ctx,
    args.organisationSlug,
    args.venueSlug,
    true,
  );
  const tz = context.timezone;
  const { startUtc, endExclusiveUtc } = venueWeekRangeUtc(args.weekStart, tz);
  const now = new Date().toISOString();

  const shiftRows = await ctx.appDb.rls((tx) =>
    workforceRepo.listShiftsInRange(tx, {
      venueId: context.venueId,
      startUtc: startUtc.toISOString(),
      endExclusiveUtc: endExclusiveUtc.toISOString(),
      lifecycle: "all",
    }),
  );

  const draftOrModified = shiftRows.filter(
    (s) => s.lifecycle === "draft" || s.lifecycle === "modified",
  );

  if (draftOrModified.length === 0 && shiftRows.length === 0) {
    throw new PeopleServiceError(400, "No shifts to publish for this week");
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

  let published = 0;
  await ctx.appDb.rls(async (tx) => {
    for (const shift of shiftRows) {
      if (shift.lifecycle === "published") continue;
      await workforceRepo.updateShift(tx, {
        shiftId: shift.id,
        venueId: context.venueId,
        row: {
          userProfileId: shift.userProfileId,
          positionId: shift.positionId,
          startsAt: shift.startsAt,
          endsAt: shift.endsAt,
          breakMinutes: shift.breakMinutes,
          lifecycle: "published",
        },
      });
      published += 1;

      if (shift.userProfileId) {
        const workDate = shift.startsAt.slice(0, 10);
        const period = await ensurePayPeriodInTx(tx, context.organisationId, workDate);
        await workforceRepo.insertTimesheetBaseline(
          tx,
          buildTimesheetBaselineFromShift({
            organisationId: context.organisationId,
            venueId: context.venueId,
            shiftId: shift.id,
            userProfileId: shift.userProfileId,
            positionId: shift.positionId,
            startsAt: shift.startsAt,
            endsAt: shift.endsAt,
            breakMinutes: shift.breakMinutes,
            payPeriodId: period.id,
            workDate,
          }),
        );

        await workforceRepo.queuePublishDelivery(tx, {
          rosterWeekId: weekId,
          userProfileId: shift.userProfileId,
          channel: "email",
          status: "pending",
        });
      }
    }

    await workforceRepo.updateRosterWeek(tx, {
      weekId,
      venueId: context.venueId,
      patch: {
        state: "published",
        publishedAt: now,
        publishedBy: ctx.userId,
      },
    });

    await workforceRepo.queuePublishDelivery(tx, {
      rosterWeekId: weekId,
      userProfileId: null,
      channel: "pdf",
      status: "pending",
    });
  });

  const staffIds = new Set(
    shiftRows.map((s) => s.userProfileId).filter(Boolean) as string[],
  );

  return {
    published,
    deliveriesQueued: staffIds.size + 1,
  };
}
