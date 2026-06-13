import type { RequestAuthContext } from "@/server/auth/context";
import type { AppDb } from "@/server/db/create-app-db";
import type { RlsTx } from "@/server/db/drizzle";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { AuthError } from "@/server/auth/errors";
import { PeopleServiceError } from "@/server/workforce/people.service";
import { postTimesheetAccrual } from "@/server/workforce/leave-accrual.service";
import { fallbackHourlyRateCents } from "@/server/workforce/roster-cost.service";
import {
  canApproveTimesheet,
  assertTimesheetOperator,
  isTimesheetOperator,
} from "@/server/workforce/timesheet-access";
import { TimesheetServiceError } from "@/server/workforce/timesheet-errors";
import {
  applyAutoDeductBreak,
  classifyVarianceTier,
  computeHoursFromTimestamps,
  computeRosteredHours,
  computeVarianceMinutes,
  computeWeeklyOtHours,
  payPeriodBoundsForDate,
  requiresOwnerApprovalForVariance,
  validateGeolocation,
  type VarianceTier,
} from "@/server/workforce/timesheet-policy";
import { timesheetRepo } from "@/server/workforce/timesheet.repo";
import { trackTimesheetEvent } from "@/server/workforce/timesheet-telemetry";

export type TimesheetEntryDto = {
  id: string;
  userProfileId: string;
  staffName: string;
  workDate: string;
  rosteredStartsAt: string;
  rosteredEndsAt: string;
  rosteredHours: number;
  actualStartsAt: string | null;
  actualEndsAt: string | null;
  actualHours: number | null;
  breakMinutes: number;
  startVarianceMin: number | null;
  endVarianceMin: number | null;
  hoursVariance: number | null;
  varianceTier: VarianceTier;
  payRateCents: number | null;
  grossPayCents: number | null;
  status: string;
  isAutoClocked: boolean;
  isNoRoster: boolean;
  geolocationFlagged: boolean;
  hasDispute: boolean;
};

export type PayPeriodDto = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  label: string;
};

export type TimesheetPagePayload = {
  isOperator: boolean;
  payPeriods: PayPeriodDto[];
  currentPayPeriodId: string | null;
  entries: TimesheetEntryDto[];
  activeClock: {
    timesheetId: string;
    startedAt: string;
    onBreak: boolean;
  } | null;
  statusCounts: Record<string, number>;
  settings: {
    geolocationEnabled: boolean;
    matchToleranceMin: number;
  };
};

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new TimesheetServiceError(error.status, error.message, "forbidden");
  }
  if (error instanceof PeopleServiceError) {
    throw new TimesheetServiceError(error.status, error.message, "forbidden");
  }
  throw error;
}

async function resolveVenueContext(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  try {
    return await resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
      notFound: () => new TimesheetServiceError(404, "Venue not found", "internal_error"),
      forbidden: (auth) => new TimesheetServiceError(auth.status, auth.message, "forbidden"),
    });
  } catch (error) {
    mapAuthError(error);
  }
}

function formatPeriodLabel(startDate: string, endDate: string): string {
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  return `${fmt.format(new Date(startDate))} – ${fmt.format(new Date(endDate))}`;
}

async function ensurePayPeriodTx(tx: RlsTx, organisationId: string, workDate: string) {
  const settings = await timesheetRepo.getOrgTimesheetSettings(tx, organisationId);
  const bounds = payPeriodBoundsForDate({
    date: workDate,
    frequency: settings.payPeriodFrequency,
    startDow: settings.periodStartDow,
  });
  const existing = await timesheetRepo.findPayPeriod(
    tx,
    organisationId,
    bounds.startDate,
    bounds.endDate,
  );
  if (existing) return existing;
  return timesheetRepo.insertPayPeriod(tx, {
    organisationId,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    frequency: settings.payPeriodFrequency,
    status: "open",
  });
}

async function ensurePayPeriodForDate(
  ctx: RequestAuthContext,
  organisationId: string,
  workDate: string,
) {
  return ctx.appDb.rls((tx) => ensurePayPeriodTx(tx, organisationId, workDate));
}

function computeEntryVariance(row: {
  rosteredStartsAt: string;
  rosteredEndsAt: string;
  rosteredBreakMinutes: number;
  actualStartsAt: string | null;
  actualEndsAt: string | null;
  actualBreakMinutes: number | null;
}) {
  const rosteredHours = computeRosteredHours(
    row.rosteredStartsAt,
    row.rosteredEndsAt,
    row.rosteredBreakMinutes,
  );
  const startVarianceMin = computeVarianceMinutes(row.actualStartsAt, row.rosteredStartsAt);
  const endVarianceMin = computeVarianceMinutes(row.actualEndsAt, row.rosteredEndsAt);
  let actualHours: number | null = null;
  if (row.actualStartsAt && row.actualEndsAt) {
    actualHours = computeHoursFromTimestamps(
      row.actualStartsAt,
      row.actualEndsAt,
      row.actualBreakMinutes ?? 0,
    );
  }
  const hoursVariance =
    actualHours != null ? Math.round((actualHours - rosteredHours) * 100) / 100 : null;
  return { rosteredHours, startVarianceMin, endVarianceMin, actualHours, hoursVariance };
}

async function mapEntryDto(
  row: Awaited<ReturnType<typeof timesheetRepo.listEntries>>[number],
  names: Map<string, string>,
  toleranceMin: number,
  hasDispute: boolean,
): Promise<TimesheetEntryDto> {
  const variance = computeEntryVariance(row);
  const tier = classifyVarianceTier({
    startVarianceMin: variance.startVarianceMin,
    endVarianceMin: variance.endVarianceMin,
    hoursVariance: variance.hoursVariance,
    hasClockData: row.actualStartsAt != null,
    toleranceMin,
  });
  const hours = variance.actualHours ?? 0;
  const rate = row.payRateCents ?? 0;
  return {
    id: row.id,
    userProfileId: row.userProfileId,
    staffName: names.get(row.userProfileId) ?? "Staff member",
    workDate: row.workDate,
    rosteredStartsAt: row.rosteredStartsAt,
    rosteredEndsAt: row.rosteredEndsAt,
    rosteredHours: variance.rosteredHours,
    actualStartsAt: row.actualStartsAt,
    actualEndsAt: row.actualEndsAt,
    actualHours: variance.actualHours,
    breakMinutes: row.actualBreakMinutes ?? row.rosteredBreakMinutes,
    startVarianceMin: variance.startVarianceMin,
    endVarianceMin: variance.endVarianceMin,
    hoursVariance: variance.hoursVariance,
    varianceTier: tier,
    payRateCents: row.payRateCents,
    grossPayCents: rate > 0 && hours > 0 ? Math.round(hours * rate) : null,
    status: row.status,
    isAutoClocked: row.isAutoClocked,
    isNoRoster: row.isNoRoster,
    geolocationFlagged: row.geolocationFlagged,
    hasDispute,
  };
}

export const timesheetService = {
  async getPageData(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; payPeriodId?: string },
  ): Promise<TimesheetPagePayload> {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    const isOperator = isTimesheetOperator(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    const today = new Date().toISOString().slice(0, 10);
    const currentPeriod = await ensurePayPeriodForDate(ctx, context.organisationId, today);
    const payPeriodId = args.payPeriodId ?? currentPeriod.id;

    const data = await ctx.appDb.rls(async (tx) => {
      const settings = await timesheetRepo.getOrgTimesheetSettings(tx, context.organisationId);
      const periods = await timesheetRepo.listPayPeriods(tx, context.organisationId);
      const entries = await timesheetRepo.listEntries(tx, {
        venueId: context.venueId,
        payPeriodId,
        userProfileId: isOperator ? undefined : ctx.userId,
      });

      const names = await timesheetRepo.getStaffNames(
        tx,
        [...new Set(entries.map((e) => e.userProfileId))],
      );

      const disputeChecks = await Promise.all(
        entries.map(async (e) => {
          const d = await timesheetRepo.getPendingDispute(tx, e.id);
          return [e.id, d != null] as const;
        }),
      );
      const disputeMap = new Map(disputeChecks);

      const dtos = await Promise.all(
        entries.map((row) =>
          mapEntryDto(row, names, settings.matchToleranceMin, disputeMap.get(row.id) ?? false),
        ),
      );

      const statusCounts: Record<string, number> = {};
      for (const e of dtos) {
        statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
      }

      const active = isOperator
        ? null
        : await timesheetRepo.getActiveClock(tx, {
            venueId: context.venueId,
            userProfileId: ctx.userId,
          });

      let activeClock: TimesheetPagePayload["activeClock"] = null;
      if (active) {
        const events = await timesheetRepo.listClockEvents(tx, active.id);
        const lastBreak = events.filter((ev) => ev.eventType === "break_start").pop();
        const breakEnded = events.some(
          (ev) =>
            ev.eventType === "break_end" &&
            lastBreak &&
            ev.eventAt > lastBreak.eventAt,
        );
        activeClock = {
          timesheetId: active.id,
          startedAt: active.actualStartsAt!,
          onBreak: lastBreak != null && !breakEnded,
        };
      }

      return {
        settings,
        periods,
        dtos,
        statusCounts,
        activeClock,
      };
    });

    trackTimesheetEvent("timesheets.viewed", {
      venue_id: context.venueId,
      pay_period_id: payPeriodId,
      role: isOperator ? "operator" : "staff",
    });

    return {
      isOperator,
      payPeriods: data.periods.map((p) => ({
        id: p.id,
        startDate: p.startDate,
        endDate: p.endDate,
        status: p.status,
        label: formatPeriodLabel(p.startDate, p.endDate),
      })),
      currentPayPeriodId: payPeriodId,
      entries: data.dtos,
      activeClock: data.activeClock,
      statusCounts: data.statusCounts,
      settings: {
        geolocationEnabled: data.settings.geolocationEnabled,
        matchToleranceMin: data.settings.matchToleranceMin,
      },
    };
  },

  async clockIn(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      shiftId?: string;
      lat?: number;
      lng?: number;
      at?: string;
    },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    const now = args.at ?? new Date().toISOString();
    const workDate = now.slice(0, 10);

    const existingActive = await ctx.appDb.rls((tx) =>
      timesheetRepo.getActiveClock(tx, {
        venueId: context.venueId,
        userProfileId: ctx.userId,
      }),
    );
    if (existingActive) {
      throw new TimesheetServiceError(409, "Already clocked in", "already_clocked_in");
    }

    const result = await ctx.appDb.rls(async (tx) => {
      const settings = await timesheetRepo.getOrgTimesheetSettings(tx, context.organisationId);
      const venueLoc = await timesheetRepo.getVenueLocation(tx, context.venueId);
      const geo = validateGeolocation({
        staffLat: args.lat,
        staffLng: args.lng,
        venueLat: venueLoc?.lat != null ? Number(venueLoc.lat) : null,
        venueLng: venueLoc?.lng != null ? Number(venueLoc.lng) : null,
        radiusM: venueLoc?.radiusM ?? 100,
      });
      const geolocationFlagged =
        settings.geolocationEnabled && (geo.flagged || args.lat == null);

      const period = await ensurePayPeriodTx(tx, context.organisationId, workDate);

      let entry = args.shiftId
        ? await timesheetRepo.getBaselineByShiftId(tx, args.shiftId)
        : await timesheetRepo.findOpenShiftForUser(tx, {
            venueId: context.venueId,
            userProfileId: ctx.userId,
            workDate,
          });

      if (!entry) {
        const shift = args.shiftId ? await timesheetRepo.getShiftById(tx, args.shiftId) : null;
        entry = await timesheetRepo.insertEntry(tx, {
          organisationId: context.organisationId,
          venueId: context.venueId,
          shiftId: shift?.id ?? null,
          userProfileId: ctx.userId,
          positionId: shift?.positionId ?? null,
          payPeriodId: period.id,
          status: "open",
          rosteredStartsAt: shift?.startsAt ?? now,
          rosteredEndsAt: shift?.endsAt ?? now,
          rosteredBreakMinutes: shift?.breakMinutes ?? 0,
          rosteredHours: shift
            ? String(
                computeRosteredHours(shift.startsAt, shift.endsAt, shift.breakMinutes),
              )
            : "0",
          payRateCents: fallbackHourlyRateCents(ctx.userId),
          isNoRoster: !shift,
          workDate,
          source: "clock_in",
          actualStartsAt: now,
          clockInLat: args.lat != null ? String(args.lat) : null,
          clockInLng: args.lng != null ? String(args.lng) : null,
          geolocationFlagged,
        });
      } else {
        entry = await timesheetRepo.updateEntry(tx, entry.id, {
          actualStartsAt: now,
          clockInLat: args.lat != null ? String(args.lat) : null,
          clockInLng: args.lng != null ? String(args.lng) : null,
          geolocationFlagged: entry.geolocationFlagged || geolocationFlagged,
          source: "clock_in",
        });
      }

      await timesheetRepo.insertClockEvent(tx, {
        timesheetId: entry!.id,
        organisationId: context.organisationId,
        eventType: "clock_in",
        eventAt: now,
        locationLat: args.lat != null ? String(args.lat) : null,
        locationLng: args.lng != null ? String(args.lng) : null,
        isValidatedLocation: !geolocationFlagged,
        createdBy: ctx.userId,
      });

      await timesheetRepo.insertAudit(tx, {
        organisationId: context.organisationId,
        timesheetId: entry!.id,
        changeType: "clock_in",
        afterState: { actualStartsAt: now },
        actorUserId: ctx.userId,
      });

      return entry!;
    });

    trackTimesheetEvent("timesheets.clock_in", {
      timesheet_id: result.id,
      geolocation_flagged: result.geolocationFlagged,
    });

    return { timesheetId: result.id, clockedInAt: now };
  },

  async clockOut(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      lat?: number;
      lng?: number;
      at?: string;
    },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    const now = args.at ?? new Date().toISOString();

    const result = await ctx.appDb.rls(async (tx) => {
      const settings = await timesheetRepo.getOrgTimesheetSettings(tx, context.organisationId);
      const active = await timesheetRepo.getActiveClock(tx, {
        venueId: context.venueId,
        userProfileId: ctx.userId,
      });
      if (!active) {
        throw new TimesheetServiceError(422, "No active clock", "no_active_clock");
      }

      const events = await timesheetRepo.listClockEvents(tx, active.id);
      const breakMinutes = computeBreakMinutesFromEvents(events);
      const grossHours = computeHoursFromTimestamps(active.actualStartsAt!, now, 0);
      const { paidHours, breakMinutes: totalBreak } = applyAutoDeductBreak({
        grossHours,
        breakMode: settings.breakMode,
        explicitBreakMinutes: breakMinutes,
        autoDeductAfterHours: Number(settings.autoDeductAfterHours),
        autoDeductBreakMin: settings.autoDeductBreakMin,
      });

      const variance = computeEntryVariance({
        ...active,
        actualEndsAt: now,
        actualBreakMinutes: totalBreak,
      });

      const updated = await timesheetRepo.updateEntry(tx, active.id, {
        actualEndsAt: now,
        actualBreakMinutes: totalBreak,
        actualHours: String(paidHours),
        rosteredHours: String(variance.rosteredHours),
        startVarianceMin: variance.startVarianceMin,
        endVarianceMin: variance.endVarianceMin,
        hoursVariance: variance.hoursVariance != null ? String(variance.hoursVariance) : null,
        clockOutLat: args.lat != null ? String(args.lat) : null,
        clockOutLng: args.lng != null ? String(args.lng) : null,
      });

      await timesheetRepo.insertClockEvent(tx, {
        timesheetId: active.id,
        organisationId: context.organisationId,
        eventType: "clock_out",
        eventAt: now,
        locationLat: args.lat != null ? String(args.lat) : null,
        locationLng: args.lng != null ? String(args.lng) : null,
        createdBy: ctx.userId,
      });

      return updated!;
    });

    trackTimesheetEvent("timesheets.clock_out", {
      timesheet_id: result.id,
      hours_worked: result.actualHours,
    });

    return {
      timesheetId: result.id,
      clockedOutAt: now,
      hoursWorked: Number(result.actualHours ?? 0),
    };
  },

  async approve(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; timesheetId: string },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    assertTimesheetOperator(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    await ctx.appDb.rls(async (tx) => {
      const settings = await timesheetRepo.getOrgTimesheetSettings(tx, context.organisationId);
      const entry = await timesheetRepo.getEntryById(tx, args.timesheetId, context.venueId);
      if (!entry) throw new TimesheetServiceError(404, "Timesheet not found", "timesheet_not_found");
      if (entry.status === "locked") {
        throw new TimesheetServiceError(409, "Timesheet is locked", "timesheet_locked");
      }
      const dispute = await timesheetRepo.getPendingDispute(tx, entry.id);
      if (dispute) {
        throw new TimesheetServiceError(422, "Resolve dispute first", "dispute_pending");
      }

      const needsOwner = requiresOwnerApprovalForVariance(
        entry.startVarianceMin,
        entry.endVarianceMin,
        entry.hoursVariance != null ? Number(entry.hoursVariance) : null,
        settings.ownerApprovalVarianceMin,
      );
      if (
        !canApproveTimesheet(ctx.tenantRoles, {
          organisationId: context.organisationId,
          venueId: context.venueId,
          requiresOwner: needsOwner,
        })
      ) {
        throw new TimesheetServiceError(403, "Owner approval required", "owner_approval_required");
      }

      const paidHours = Number(entry.actualHours ?? entry.rosteredHours ?? 0);
      const rate = entry.payRateCents ?? fallbackHourlyRateCents(entry.userProfileId);
      const weekStart = entry.workDate;
      const weeklyHours = await timesheetRepo.sumWeeklyHours(tx, {
        userProfileId: entry.userProfileId,
        organisationId: context.organisationId,
        weekStart,
        weekEnd: weekStart,
      });
      const otHours = computeWeeklyOtHours(weeklyHours + paidHours);
      const baseHours = Math.max(0, paidHours - otHours);
      const grossCents = Math.round(baseHours * rate + otHours * rate * 1.5);

      await timesheetRepo.updateEntry(tx, entry.id, {
        status: "approved",
        approvedBy: ctx.userId,
        approvedAt: new Date().toISOString(),
      });

      if (entry.payPeriodId) {
        await timesheetRepo.insertPayrollLine(tx, {
          organisationId: context.organisationId,
          timesheetId: entry.id,
          userProfileId: entry.userProfileId,
          payPeriodId: entry.payPeriodId,
          hours: String(paidHours),
          baseRateCents: rate,
          overtimeHours: String(otHours),
          overtimeRateCents: Math.round(rate * 1.5),
          grossCents,
        });
      }

      await timesheetRepo.insertAudit(tx, {
        organisationId: context.organisationId,
        timesheetId: entry.id,
        changeType: "approved",
        actorUserId: ctx.userId,
      });

      await postTimesheetAccrual(tx, {
        organisationId: context.organisationId,
        userProfileId: entry.userProfileId,
        timesheetId: entry.id,
        paidHoursWorked: paidHours,
      });
    });

    trackTimesheetEvent("timesheets.approved", { timesheet_id: args.timesheetId });
    return { ok: true };
  },

  async bulkApprove(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; ids: string[] },
  ) {
    let approved = 0;
    for (const id of args.ids) {
      try {
        await timesheetService.approve(ctx, {
          organisationSlug: args.organisationSlug,
          venueSlug: args.venueSlug,
          timesheetId: id,
        });
        approved += 1;
      } catch (error) {
        if (error instanceof TimesheetServiceError && error.code === "owner_approval_required") {
          throw error;
        }
      }
    }
    trackTimesheetEvent("timesheets.bulk_approved", { count: approved });
    return { approved };
  },

  async editEntry(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      timesheetId: string;
      actualStartsAt?: string;
      actualEndsAt?: string;
      actualBreakMinutes?: number;
      reason: string;
    },
  ) {
    if (!args.reason.trim()) {
      throw new TimesheetServiceError(422, "Reason is required", "reason_required");
    }
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    assertTimesheetOperator(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    await ctx.appDb.rls(async (tx) => {
      const entry = await timesheetRepo.getEntryById(tx, args.timesheetId, context.venueId);
      if (!entry) throw new TimesheetServiceError(404, "Timesheet not found", "timesheet_not_found");
      if (entry.status === "locked") {
        throw new TimesheetServiceError(409, "Timesheet is locked", "timesheet_locked");
      }

      const before = { ...entry };
      const actualStartsAt = args.actualStartsAt ?? entry.actualStartsAt;
      const actualEndsAt = args.actualEndsAt ?? entry.actualEndsAt;
      const actualBreakMinutes = args.actualBreakMinutes ?? entry.actualBreakMinutes ?? 0;

      const variance = computeEntryVariance({
        rosteredStartsAt: entry.rosteredStartsAt,
        rosteredEndsAt: entry.rosteredEndsAt,
        rosteredBreakMinutes: entry.rosteredBreakMinutes,
        actualStartsAt,
        actualEndsAt,
        actualBreakMinutes,
      });

      await timesheetRepo.updateEntry(tx, entry.id, {
        actualStartsAt: actualStartsAt ?? undefined,
        actualEndsAt: actualEndsAt ?? undefined,
        actualBreakMinutes,
        actualHours:
          actualStartsAt && actualEndsAt
            ? String(computeHoursFromTimestamps(actualStartsAt, actualEndsAt, actualBreakMinutes))
            : null,
        startVarianceMin: variance.startVarianceMin,
        endVarianceMin: variance.endVarianceMin,
        hoursVariance: variance.hoursVariance != null ? String(variance.hoursVariance) : null,
        notesManager: args.reason.trim(),
        source: "manager_edit",
      });

      await timesheetRepo.insertAudit(tx, {
        organisationId: context.organisationId,
        timesheetId: entry.id,
        changeType: "edited",
        beforeState: before,
        afterState: { actualStartsAt, actualEndsAt, actualBreakMinutes },
        reason: args.reason.trim(),
        actorUserId: ctx.userId,
      });
    });

    trackTimesheetEvent("timesheets.edited", { timesheet_id: args.timesheetId });
    return { ok: true };
  },

  async dispute(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      timesheetId: string;
      claimedStartsAt?: string;
      claimedEndsAt?: string;
      claimNotes: string;
    },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);

    await ctx.appDb.rls(async (tx) => {
      const entry = await timesheetRepo.getEntryById(tx, args.timesheetId, context.venueId);
      if (!entry) throw new TimesheetServiceError(404, "Timesheet not found", "timesheet_not_found");
      if (entry.userProfileId !== ctx.userId) {
        assertTimesheetOperator(ctx.tenantRoles, {
          organisationId: context.organisationId,
          venueId: context.venueId,
        });
      }
      if (entry.status === "locked") {
        throw new TimesheetServiceError(409, "Timesheet is locked", "timesheet_locked");
      }

      await timesheetRepo.insertDispute(tx, {
        timesheetId: entry.id,
        organisationId: context.organisationId,
        disputedBy: ctx.userId,
        claimedStartsAt: args.claimedStartsAt ?? null,
        claimedEndsAt: args.claimedEndsAt ?? null,
        claimNotes: args.claimNotes.trim(),
      });

      await timesheetRepo.updateEntry(tx, entry.id, { status: "disputed" });
    });

    trackTimesheetEvent("timesheets.disputed", { timesheet_id: args.timesheetId });
    return { ok: true };
  },

  async resolveDispute(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      timesheetId: string;
      resolution: "accepted" | "partial" | "rejected";
      resolutionNotes?: string;
      adjustedStartsAt?: string;
      adjustedEndsAt?: string;
    },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    assertTimesheetOperator(ctx.tenantRoles, {
      organisationId: context.organisationId,
      venueId: context.venueId,
    });

    await ctx.appDb.rls(async (tx) => {
      const entry = await timesheetRepo.getEntryById(tx, args.timesheetId, context.venueId);
      if (!entry) throw new TimesheetServiceError(404, "Timesheet not found", "timesheet_not_found");
      const dispute = await timesheetRepo.getPendingDispute(tx, entry.id);
      if (!dispute) {
        throw new TimesheetServiceError(422, "No pending dispute", "dispute_pending");
      }

      await timesheetRepo.resolveDispute(tx, dispute.id, {
        resolution: args.resolution,
        resolutionNotes: args.resolutionNotes,
        resolvedBy: ctx.userId,
      });

      if (args.resolution === "accepted" || args.resolution === "partial") {
        const starts = args.adjustedStartsAt ?? dispute.claimedStartsAt ?? entry.actualStartsAt;
        const ends = args.adjustedEndsAt ?? dispute.claimedEndsAt ?? entry.actualEndsAt;
        if (starts && ends) {
          const breakMin = entry.actualBreakMinutes ?? 0;
          await timesheetRepo.updateEntry(tx, entry.id, {
            actualStartsAt: starts,
            actualEndsAt: ends,
            actualHours: String(computeHoursFromTimestamps(starts, ends, breakMin)),
            status: "submitted",
            source: "dispute_resolution",
          });
        } else {
          await timesheetRepo.updateEntry(tx, entry.id, { status: "submitted" });
        }
      } else {
        await timesheetRepo.updateEntry(tx, entry.id, { status: "submitted" });
      }
    });

    trackTimesheetEvent("timesheets.dispute_resolved", {
      timesheet_id: args.timesheetId,
      resolution: args.resolution,
    });
    return { ok: true };
  },

  async breakStart(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    const now = new Date().toISOString();

    await ctx.appDb.rls(async (tx) => {
      const active = await timesheetRepo.getActiveClock(tx, {
        venueId: context.venueId,
        userProfileId: ctx.userId,
      });
      if (!active) {
        throw new TimesheetServiceError(422, "No active clock", "no_active_clock");
      }
      await timesheetRepo.insertClockEvent(tx, {
        timesheetId: active.id,
        organisationId: context.organisationId,
        eventType: "break_start",
        eventAt: now,
        createdBy: ctx.userId,
      });
    });
    return { ok: true };
  },

  async breakEnd(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ) {
    const context = await resolveVenueContext(ctx, args.organisationSlug, args.venueSlug);
    const now = new Date().toISOString();

    await ctx.appDb.rls(async (tx) => {
      const active = await timesheetRepo.getActiveClock(tx, {
        venueId: context.venueId,
        userProfileId: ctx.userId,
      });
      if (!active) {
        throw new TimesheetServiceError(422, "No active clock", "no_active_clock");
      }
      await timesheetRepo.insertClockEvent(tx, {
        timesheetId: active.id,
        organisationId: context.organisationId,
        eventType: "break_end",
        eventAt: now,
        createdBy: ctx.userId,
      });
    });
    return { ok: true };
  },

  async processAutoClockOuts(appDb: Pick<AppDb, "admin">) {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    await appDb.admin.transaction(async (tx) => {
      const rows = await timesheetRepo.listOpenForAutoClockOut(tx, cutoff);
      for (const row of rows) {
        const endAt = row.rosteredEndsAt;
        await timesheetRepo.updateEntry(tx, row.id, {
          actualEndsAt: endAt,
          isAutoClocked: true,
          actualHours: String(
            computeHoursFromTimestamps(
              row.actualStartsAt!,
              endAt,
              row.actualBreakMinutes ?? row.rosteredBreakMinutes,
            ),
          ),
          source: "auto_clock_out",
        });
        await timesheetRepo.insertClockEvent(tx, {
          timesheetId: row.id,
          organisationId: row.organisationId,
          eventType: "auto_clock_out",
          eventAt: endAt,
        });
        trackTimesheetEvent("timesheets.auto_clock_out", { timesheet_id: row.id });
      }
    });
  },
};

function computeBreakMinutesFromEvents(
  events: Awaited<ReturnType<typeof timesheetRepo.listClockEvents>>,
): number {
  let total = 0;
  let breakStart: string | null = null;
  for (const ev of events) {
    if (ev.eventType === "break_start") breakStart = ev.eventAt;
    if (ev.eventType === "break_end" && breakStart) {
      total += Math.max(
        0,
        Math.round((new Date(ev.eventAt).getTime() - new Date(breakStart).getTime()) / 60_000),
      );
      breakStart = null;
    }
  }
  return total;
}

/** Baseline row for roster publish — called from roster.service */
export function buildTimesheetBaselineFromShift(args: {
  organisationId: string;
  venueId: string;
  shiftId: string;
  userProfileId: string;
  positionId: string;
  startsAt: string;
  endsAt: string;
  breakMinutes: number;
  payPeriodId: string;
  workDate: string;
}) {
  const rosteredHours = computeRosteredHours(args.startsAt, args.endsAt, args.breakMinutes);
  return {
    organisationId: args.organisationId,
    venueId: args.venueId,
    shiftId: args.shiftId,
    userProfileId: args.userProfileId,
    positionId: args.positionId,
    payPeriodId: args.payPeriodId,
    status: "open" as const,
    rosteredStartsAt: args.startsAt,
    rosteredEndsAt: args.endsAt,
    rosteredBreakMinutes: args.breakMinutes,
    rosteredHours: String(rosteredHours),
    payRateCents: fallbackHourlyRateCents(args.userProfileId),
    workDate: args.workDate,
    source: "roster_publish",
  };
}

export async function ensurePayPeriodInTx(tx: RlsTx, organisationId: string, workDate: string) {
  return ensurePayPeriodTx(tx, organisationId, workDate);
}
