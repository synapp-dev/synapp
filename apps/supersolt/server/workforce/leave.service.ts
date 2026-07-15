import type { RequestAuthContext } from "@/server/auth/context";
import { isOrganisationAdminForOrg } from "@/server/auth/capabilities";
import { resolveVenueScopeForService } from "@/server/access/require-venue-scope";
import { scopeRepo } from "@/server/db/scope.repo";
import { peopleService } from "@/server/workforce/people.service";
import {
  canApproveLeaveRequest,
  assertLeaveOperator,
  isLeaveOperator,
} from "@/server/workforce/leave-access";
import { LeaveServiceError } from "@/server/workforce/leave-errors";
import {
  computeLeaveHours,
  canViewLeaveReason,
  formatHoursAndDays,
  lslBalanceHours,
  maskCalendarLabel,
  requiresOwnerApproval,
  yearsBetween,
  casualCannotAccrue,
  type LeaveTypeCode,
} from "@/server/workforce/leave-policy";
import { createPayrollLeaveLineForRequest, postTimesheetAccrual } from "@/server/workforce/leave-accrual.service";
import { leaveRepo } from "@/server/workforce/leave.repo";
import { seedDefaultLeaveTypes } from "@/server/workforce/leave-seed";
import { trackLeaveEvent } from "@/server/workforce/leave-telemetry";

export type LeaveBalanceDto = {
  leaveTypeId: string;
  code: string;
  name: string;
  isPrivate: boolean;
  currentBalanceHours: number;
  currentBalanceDays: number;
};

export type LeaveRequestDto = {
  id: string;
  userProfileId: string;
  staffName: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  calendarLabel: string;
  isPrivate: boolean;
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number;
  paidHours: number;
  unpaidHours: number;
  isPaid: boolean;
  reason: string | null;
  commentsToManager: string | null;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  teamOverlapCount?: number;
  rosterShiftCount?: number;
};

export type LeavePagePayload = {
  isOperator: boolean;
  balances: LeaveBalanceDto[];
  requests: LeaveRequestDto[];
};

function num(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function resolveVenueScope(
  ctx: RequestAuthContext,
  organisationSlug: string,
  venueSlug: string,
) {
  return resolveVenueScopeForService(ctx, organisationSlug, venueSlug, {
    notFound: (message) => new LeaveServiceError(404, message, "internal_error"),
    forbidden: (auth) => new LeaveServiceError(auth.status, auth.message, "forbidden"),
  });
}

async function ensureLeaveTypes(ctx: RequestAuthContext, organisationId: string) {
  await ctx.appDb.rls((tx) => seedDefaultLeaveTypes(tx, organisationId));
}

function staffNameMap(
  staff: Awaited<ReturnType<typeof peopleService.listForVenue>>["staff"],
) {
  return new Map(staff.map((s) => [s.id, s.name]));
}

function toRequestDto(
  row: Awaited<ReturnType<typeof leaveRepo.listRequests>>[number],
  names: Map<string, string>,
  viewerId: string,
  isOwner: boolean,
  extras?: Partial<LeaveRequestDto>,
): LeaveRequestDto {
  const { request, leaveType } = row;
  const canSeeReason = canViewLeaveReason({
    viewerId,
    subjectId: request.userProfileId,
    isPrivate: leaveType.isPrivate,
    isOwner,
    isDecidingManager: false,
  });

  return {
    id: request.id,
    userProfileId: request.userProfileId,
    staffName: names.get(request.userProfileId) ?? "Staff member",
    leaveTypeId: leaveType.id,
    leaveTypeCode: leaveType.code,
    leaveTypeName: leaveType.name,
    calendarLabel: maskCalendarLabel(leaveType.isPrivate, leaveType.name),
    isPrivate: leaveType.isPrivate,
    startDate: request.startDate,
    endDate: request.endDate,
    startTime: request.startTime,
    endTime: request.endTime,
    totalHours: num(request.totalHours),
    paidHours: num(request.paidHours),
    unpaidHours: num(request.unpaidHours),
    isPaid: request.isPaid,
    reason: canSeeReason ? request.reason : null,
    commentsToManager: request.commentsToManager,
    status: request.status,
    requestedAt: request.requestedAt,
    decidedAt: request.decidedAt,
    decisionReason: request.decisionReason,
    ...extras,
  };
}

export const leaveService = {
  async getPageData(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<LeavePagePayload> {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    await ensureLeaveTypes(ctx, scope.organisationId);

    const operator = isLeaveOperator(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });
    const isOwner = isOrganisationAdminForOrg(ctx.tenantRoles, scope.organisationId);

    const staff = await peopleService.listForVenue(ctx, args);
    const names = staffNameMap(staff.staff);

    const targetUserId = operator ? undefined : ctx.userId;
    const balanceUserId = targetUserId ?? ctx.userId;

    const [balanceRows, requestRows] = await ctx.appDb.rls(async (tx) => {
      const types = await leaveRepo.listLeaveTypes(tx, scope.organisationId);
      for (const t of types) {
        await leaveRepo.ensureBalanceRow(tx, {
          organisationId: scope.organisationId,
          userProfileId: balanceUserId,
          leaveTypeId: t.id,
        });
      }

      const balances = await leaveRepo.listBalancesForUser(tx, {
        organisationId: scope.organisationId,
        userProfileId: balanceUserId,
      });
      const requests = await leaveRepo.listRequests(tx, {
        organisationId: scope.organisationId,
        venueId: operator ? scope.venueId : undefined,
        userProfileId: targetUserId,
      });
      return [balances, requests] as const;
    });

    trackLeaveEvent("leave.viewed", {
      venue_id: scope.venueId,
      role_surface: operator ? "manager" : "staff",
    });

    return {
      isOperator: operator,
      balances: balanceRows.map(({ balance, leaveType }) => {
        const hours = num(balance.currentBalanceHours);
        const formatted = formatHoursAndDays(hours);
        return {
          leaveTypeId: leaveType.id,
          code: leaveType.code,
          name: leaveType.name,
          isPrivate: leaveType.isPrivate,
          currentBalanceHours: formatted.hours,
          currentBalanceDays: formatted.days,
        };
      }),
      requests: requestRows.map((r) =>
        toRequestDto(r, names, ctx.userId, isOwner),
      ),
    };
  },

  async createRequest(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      leaveTypeId: string;
      startDate: string;
      endDate: string;
      startTime?: string | null;
      endTime?: string | null;
      reason?: string | null;
      commentsToManager?: string | null;
      userProfileId?: string;
      paidHoursOverride?: number;
      unpaidHoursOverride?: number;
    },
  ): Promise<LeaveRequestDto> {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    await ensureLeaveTypes(ctx, scope.organisationId);

    const subjectId = args.userProfileId?.trim() || ctx.userId;
    if (subjectId !== ctx.userId) {
      assertLeaveOperator(ctx.tenantRoles, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
    }

    const staff = await peopleService.listForVenue(ctx, {
      organisationSlug: args.organisationSlug,
      venueSlug: args.venueSlug,
    });
    const names = staffNameMap(staff.staff);

    const result = await ctx.appDb.rls(async (tx) => {
      const leaveType = await leaveRepo.getLeaveTypeById(tx, scope.organisationId, args.leaveTypeId);
      if (!leaveType || leaveType.isArchived) {
        throw new LeaveServiceError(404, "Leave type not found", "leave_type_not_found");
      }

      const employment = await leaveRepo.getEmploymentType(tx, scope.organisationId, subjectId);
      if (
        employment?.employmentType === "casual" &&
        casualCannotAccrue(leaveType.code as LeaveTypeCode)
      ) {
        throw new LeaveServiceError(
          422,
          "This leave type is not available for casual employment",
          "leave_type_not_applicable",
        );
      }

      const totalHours = computeLeaveHours({
        startDate: args.startDate,
        endDate: args.endDate,
        startTime: args.startTime,
        endTime: args.endTime,
      });

      let paidHours = args.paidHoursOverride ?? (leaveType.isPaid ? totalHours : 0);
      let unpaidHours = args.unpaidHoursOverride ?? totalHours - paidHours;

      if (args.paidHoursOverride == null && leaveType.isAccruable && !leaveType.isPerOccasion) {
        await leaveRepo.ensureBalanceRow(tx, {
          organisationId: scope.organisationId,
          userProfileId: subjectId,
          leaveTypeId: leaveType.id,
        });
        const balances = await leaveRepo.listBalancesForUser(tx, {
          organisationId: scope.organisationId,
          userProfileId: subjectId,
        });
        const bal = balances.find((b) => b.leaveType.id === leaveType.id);
        const available = num(bal?.balance.currentBalanceHours);

        if (leaveType.code === "long_service") {
          const venueState = await leaveRepo.getVenueState(tx, scope.venueId);
          const rule = await leaveRepo.getLslRule(tx, venueState);
          const startIso =
            employment?.joinedAt?.slice(0, 10) ??
            employment?.createdAt?.slice(0, 10) ??
            args.startDate;
          const years = yearsBetween(startIso, args.startDate);
          const lslAvail = rule
            ? lslBalanceHours({
                yearsOfService: years,
                stateAccrualWeeksPerYear: num(rule.accrualWeeksPerYear),
                minYears: num(rule.minYearsService),
              })
            : 0;
          if (totalHours > lslAvail) {
            throw new LeaveServiceError(
              422,
              `Insufficient long service balance: ${lslAvail}h available, ${totalHours}h requested`,
              "lsl_insufficient_balance",
            );
          }
        } else if (paidHours > available) {
          if (args.paidHoursOverride == null && args.unpaidHoursOverride == null) {
            throw new LeaveServiceError(
              422,
              `Insufficient balance: ${available}h available, ${totalHours}h requested`,
              "insufficient_balance",
            );
          }
        }

        if (paidHours > available && args.paidHoursOverride == null) {
          paidHours = available;
          unpaidHours = totalHours - paidHours;
        }
      }

      if (paidHours + unpaidHours !== totalHours) {
        throw new LeaveServiceError(422, "Invalid paid/unpaid split", "internal_error");
      }

      const inserted = await leaveRepo.insertRequest(tx, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
        userProfileId: subjectId,
        leaveTypeId: leaveType.id,
        startDate: args.startDate,
        endDate: args.endDate,
        startTime: args.startTime ?? null,
        endTime: args.endTime ?? null,
        totalHours: String(totalHours),
        isPaid: leaveType.isPaid,
        paidHours: String(paidHours),
        unpaidHours: String(unpaidHours),
        reason: args.reason ?? null,
        commentsToManager: args.commentsToManager ?? null,
        status: "pending",
      });

      await leaveRepo.insertAudit(tx, {
        organisationId: scope.organisationId,
        leaveRequestId: inserted.id,
        userProfileId: subjectId,
        changeType: "request_created",
        beforeState: null,
        afterState: inserted,
        actorUserId: ctx.userId,
      });

      return { inserted, leaveType };
    });

    trackLeaveEvent("leave.request_submitted", {
      leave_type_code: result.leaveType.code,
      total_hours: num(result.inserted.totalHours),
      pending: true,
    });

    return toRequestDto(
      { request: result.inserted, leaveType: result.leaveType },
      names,
      ctx.userId,
      isOrganisationAdminForOrg(ctx.tenantRoles, scope.organisationId),
    );
  },

  async withdrawRequest(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; requestId: string },
  ) {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    await ctx.appDb.rls(async (tx) => {
      const row = await leaveRepo.getRequestById(tx, args.requestId);
      if (!row || row.request.organisationId !== scope.organisationId) {
        throw new LeaveServiceError(404, "Request not found", "request_not_found");
      }
      if (row.request.userProfileId !== ctx.userId) {
        throw new LeaveServiceError(403, "Forbidden", "forbidden");
      }
      if (row.request.status !== "pending") {
        throw new LeaveServiceError(409, "Only pending requests can be withdrawn", "invalid_status_transition");
      }
      const updated = await leaveRepo.updateRequest(tx, args.requestId, { status: "withdrawn" });
      await leaveRepo.insertAudit(tx, {
        organisationId: scope.organisationId,
        leaveRequestId: args.requestId,
        userProfileId: row.request.userProfileId,
        changeType: "withdrawn",
        beforeState: row.request,
        afterState: updated,
        actorUserId: ctx.userId,
      });
    });
    trackLeaveEvent("leave.withdrawn", { request_id: args.requestId });
  },

  async cancelRequest(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      requestId: string;
      reason?: string;
      asManager?: boolean;
    },
  ) {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    if (args.asManager) {
      assertLeaveOperator(ctx.tenantRoles, {
        organisationId: scope.organisationId,
        venueId: scope.venueId,
      });
    }

    await ctx.appDb.rls(async (tx) => {
      const row = await leaveRepo.getRequestById(tx, args.requestId);
      if (!row || row.request.organisationId !== scope.organisationId) {
        throw new LeaveServiceError(404, "Request not found", "request_not_found");
      }
      if (!args.asManager && row.request.userProfileId !== ctx.userId) {
        throw new LeaveServiceError(403, "Forbidden", "forbidden");
      }
      if (row.request.status !== "approved" && row.request.status !== "pending") {
        throw new LeaveServiceError(409, "Cannot cancel this request", "invalid_status_transition");
      }

      if (row.request.status === "approved" && row.leaveType.isAccruable && !row.leaveType.isPerOccasion) {
        const balanceId = await leaveRepo.ensureBalanceRow(tx, {
          organisationId: scope.organisationId,
          userProfileId: row.request.userProfileId,
          leaveTypeId: row.leaveType.id,
        });
        await leaveRepo.adjustBalanceHours(tx, {
          balanceId,
          currentDelta: num(row.request.paidHours),
          usedDelta: -num(row.request.paidHours),
        });
      }

      const updated = await leaveRepo.updateRequest(tx, args.requestId, {
        status: "cancelled",
        decisionReason: args.reason ?? row.request.decisionReason,
        decidedAt: new Date().toISOString(),
        decidedByUserId: ctx.userId,
      });

      await leaveRepo.insertAudit(tx, {
        organisationId: scope.organisationId,
        leaveRequestId: args.requestId,
        userProfileId: row.request.userProfileId,
        changeType: args.asManager ? "manager_revoked" : "cancelled",
        beforeState: row.request,
        afterState: updated,
        actorUserId: ctx.userId,
      });
    });

    trackLeaveEvent("leave.cancelled", {
      request_id: args.requestId,
      by: args.asManager ? "manager" : "staff",
    });
  },

  async decideRequest(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      venueSlug: string;
      requestId: string;
      approved: boolean;
      reason?: string;
      rosterResolution?: { mode: "unassign_all" | "keep_all"; shiftIds?: string[] };
    },
  ) {
    const scope = await resolveVenueScope(ctx, args.organisationSlug, args.venueSlug);
    assertLeaveOperator(ctx.tenantRoles, {
      organisationId: scope.organisationId,
      venueId: scope.venueId,
    });

    const orgSettings = await ctx.appDb.rls((tx) =>
      leaveRepo.getOrgLeaveSettings(tx, scope.organisationId),
    );

    await ctx.appDb.rls(async (tx) => {
      const row = await leaveRepo.getRequestById(tx, args.requestId);
      if (!row || row.request.organisationId !== scope.organisationId) {
        throw new LeaveServiceError(404, "Request not found", "request_not_found");
      }
      if (row.request.status !== "pending") {
        throw new LeaveServiceError(409, "Request already decided", "invalid_status_transition");
      }

      const needsOwner = requiresOwnerApproval({
        startDate: row.request.startDate,
        endDate: row.request.endDate,
        leaveTypeDefaultRole: row.leaveType.defaultApprovalRole,
        orgMinDaysForOwner: orgSettings.leaveOwnerApprovalMinDays ?? 5,
      });

      if (
        !canApproveLeaveRequest(ctx.tenantRoles, {
          organisationId: scope.organisationId,
          venueId: scope.venueId,
          requiresOwner: needsOwner,
        })
      ) {
        throw new LeaveServiceError(
          403,
          "This request requires Owner / Area Manager approval",
          "owner_approval_required",
        );
      }

      if (!args.approved) {
        const updated = await leaveRepo.updateRequest(tx, args.requestId, {
          status: "rejected",
          decidedAt: new Date().toISOString(),
          decidedByUserId: ctx.userId,
          decisionReason: args.reason ?? null,
        });
        await leaveRepo.insertAudit(tx, {
          organisationId: scope.organisationId,
          leaveRequestId: args.requestId,
          userProfileId: row.request.userProfileId,
          changeType: "rejected",
          beforeState: row.request,
          afterState: updated,
          actorUserId: ctx.userId,
        });
        trackLeaveEvent("leave.rejected", { request_id: args.requestId });
        return;
      }

      if (row.leaveType.isAccruable && !row.leaveType.isPerOccasion) {
        const balanceId = await leaveRepo.ensureBalanceRow(tx, {
          organisationId: scope.organisationId,
          userProfileId: row.request.userProfileId,
          leaveTypeId: row.leaveType.id,
        });
        const paid = num(row.request.paidHours);
        await leaveRepo.adjustBalanceHours(tx, {
          balanceId,
          currentDelta: -paid,
          usedDelta: paid,
        });
        await leaveRepo.insertAccrualEvent(tx, {
          organisationId: scope.organisationId,
          userProfileId: row.request.userProfileId,
          leaveTypeId: row.leaveType.id,
          triggeredBy: "leave_taken",
          hoursChange: String(-paid),
          sourceRef: args.requestId,
        });
      }

      const shifts = await leaveRepo.listShiftsForStaffInDateRange(tx, {
        venueId: scope.venueId,
        userProfileId: row.request.userProfileId,
        startDate: row.request.startDate,
        endDate: row.request.endDate,
      });

      if (args.rosterResolution?.mode === "unassign_all") {
        const ids = args.rosterResolution.shiftIds?.length
          ? args.rosterResolution.shiftIds
          : shifts.map((s) => s.id);
        await leaveRepo.unassignShifts(tx, ids);
      }

      const updated = await leaveRepo.updateRequest(tx, args.requestId, {
        status: "approved",
        decidedAt: new Date().toISOString(),
        decidedByUserId: ctx.userId,
        decisionReason: args.reason ?? null,
        rosterResolution: args.rosterResolution ?? null,
      });

      await createPayrollLeaveLineForRequest(tx, {
        organisationId: scope.organisationId,
        userProfileId: row.request.userProfileId,
        leaveRequestId: args.requestId,
        leaveTypeId: row.leaveType.id,
        paidHours: num(row.request.paidHours),
        startDate: row.request.startDate,
        endDate: row.request.endDate,
      });

      await leaveRepo.insertAudit(tx, {
        organisationId: scope.organisationId,
        leaveRequestId: args.requestId,
        userProfileId: row.request.userProfileId,
        changeType: "approved",
        beforeState: row.request,
        afterState: updated,
        actorUserId: ctx.userId,
      });

      if (shifts.length > 0) {
        trackLeaveEvent("leave.roster_conflict", { shift_count: shifts.length });
      }
      trackLeaveEvent("leave.approved", {
        request_id: args.requestId,
        roster_resolution_mode: args.rosterResolution?.mode,
      });
    });
  },

  async bulkApprove(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string; requestIds: string[] },
  ) {
    for (const requestId of args.requestIds) {
      await leaveService.decideRequest(ctx, {
        organisationSlug: args.organisationSlug,
        venueSlug: args.venueSlug,
        requestId,
        approved: true,
      });
    }
  },

  async listApprovedRangesForRoster(
    ctx: RequestAuthContext,
    args: {
      organisationId: string;
      venueId: string;
      staffIds: string[];
      weekStart: string;
      weekEnd: string;
    },
  ) {
    return ctx.appDb.rls((tx) =>
      leaveRepo.listApprovedLeaveRanges(tx, {
        organisationId: args.organisationId,
        venueId: args.venueId,
        userProfileIds: args.staffIds,
        from: args.weekStart,
        to: args.weekEnd,
      }),
    );
  },

  async onTimesheetApproved(
    ctx: RequestAuthContext,
    args: {
      organisationId: string;
      userProfileId: string;
      timesheetId: string;
      paidHoursWorked: number;
    },
  ) {
    await ctx.appDb.rls((tx) =>
      postTimesheetAccrual(tx, {
        organisationId: args.organisationId,
        userProfileId: args.userProfileId,
        timesheetId: args.timesheetId,
        paidHoursWorked: args.paidHoursWorked,
      }),
    );
    trackLeaveEvent("leave.accrual_posted", {
      timesheet_id: args.timesheetId,
      hours_change: args.paidHoursWorked,
    });
  },

  async listOrgLeaveTypes(ctx: RequestAuthContext, organisationSlug: string) {
    const organisationId = await ctx.appDb.rls((tx) =>
      scopeRepo.getOrganisationIdBySlug(tx, organisationSlug),
    );
    if (!organisationId) throw new LeaveServiceError(404, "Organisation not found", "internal_error");
    if (!isOrganisationAdminForOrg(ctx.tenantRoles, organisationId)) {
      throw new LeaveServiceError(403, "Forbidden", "forbidden");
    }
    await ensureLeaveTypes(ctx, organisationId);
    return ctx.appDb.rls((tx) => leaveRepo.listLeaveTypes(tx, organisationId, true));
  },
};

export { postTimesheetAccrual };
