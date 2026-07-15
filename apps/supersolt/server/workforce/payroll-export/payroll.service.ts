import { eq } from "drizzle-orm";
import type { RequestAuthContext } from "@/server/auth/context";
import {
  canApprovePayrollRun,
  canExecutePayrollPayment,
  canPreparePayrollRun,
} from "@/server/auth/capabilities";
import { AuthError } from "@/server/auth/errors";
import { resolveOrganisationIdBySlug } from "@/server/auth/rbac";
import type { AppDb } from "@/server/db/create-app-db";
import { scopeRepo } from "@/server/db/scope.repo";
import { payPeriods, payRuns } from "@/server/db/schema";
import {
  assertCanApprovePayroll,
  assertCanExecutePayroll,
  viewerCanSeeFdv,
} from "@/server/workforce/payroll-export/payroll-access";
import {
  aggregateEmployeeLines,
  type EmployeePayrollProfile,
  type LeavePayrollLine,
  type TimesheetPayrollLine,
} from "@/server/workforce/payroll-export/payroll-calculation";
import { PayrollServiceError } from "@/server/workforce/payroll-export/payroll-errors";
import {
  canEditLineItem,
  canTransitionPayRunStatus,
  stripFdvFromLineItemDto,
  type PayRunLineItemDto,
  type PayRunStatus,
} from "@/server/workforce/payroll-export/payroll-policy";
import { runPreflight } from "@/server/workforce/payroll-export/payroll-preflight";
import { payrollRepo } from "@/server/workforce/payroll-export/payroll.repo";
import { trackPayrollEvent } from "@/server/workforce/payroll-export/payroll-telemetry";
import {
  digestPayload,
  pushPayRunToXero,
  type XeroPayrollPushPayload,
} from "@/server/xero/payroll/xero-payroll-client";

export type PayrollPeriodDto = {
  payPeriodId: string;
  startDate: string;
  endDate: string;
  status: string;
  payRunId: string | null;
  payRunStatus: PayRunStatus | null;
  approvedTimesheetCount: number;
  label: string;
};

export type PayrollPagePayload = {
  canPrepare: boolean;
  canApprove: boolean;
  canExecute: boolean;
  xeroConnected: boolean;
  periods: PayrollPeriodDto[];
  activePayRun: PayRunSummaryDto | null;
};

export type PayRunSummaryDto = {
  id: string;
  payPeriodId: string;
  status: PayRunStatus;
  periodStart: string;
  periodEnd: string;
  payDate: string;
  totalGrossCents: number;
  totalSuperCents: number;
  totalPaygCents: number;
  totalNetCents: number;
  employeeCount: number;
  ownerReturnNotes: string | null;
  lineItems: PayRunLineItemDto[];
  lastPreflight: {
    passed: boolean;
    hardBlockCount: number;
    softWarningCount: number;
    issues: Array<{ staffName: string; code: string; severity: string; message: string }>;
  } | null;
};

function mapAuthError(error: unknown): never {
  if (error instanceof AuthError) {
    throw new PayrollServiceError(error.status, error.message, "forbidden");
  }
  throw error;
}

function formatPeriodLabel(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type PayRunRow = typeof payRuns.$inferSelect;

type PayrollAdminDb = Pick<AppDb, "admin">;

async function performXeroPayRunPushAdmin(
  appDb: PayrollAdminDb,
  run: PayRunRow,
  organisationId: string,
  xeroVenueId: string | null,
): Promise<void> {
  const xeroConn = xeroVenueId
    ? await payrollRepo.getXeroConnectionAdmin(appDb, xeroVenueId)
    : null;
  if (!xeroConn?.xeroTenantId || !xeroConn.xeroAccessToken) {
    if (process.env.XERO_PAYROLL_MOCK !== "1") {
      throw new PayrollServiceError(
        422,
        "Connect Xero in Settings → Integrations before running payroll.",
        "xero_not_connected",
      );
    }
  }

  const lines = await payrollRepo.listLineItemsAdmin(appDb.admin, run.id);
  const payload: XeroPayrollPushPayload = {
    payRunId: run.id,
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    payDate: run.payDate,
    employees: lines.map((l) => ({
      userProfileId: l.userProfileId,
      grossCents: l.grossCents,
      superCents: l.superCents,
      paygCents: l.paygCents,
      netCents: l.netCents,
      hoursTotal: Number(l.hoursTotal),
    })),
  };

  trackPayrollEvent("payroll.xero_push_started", {
    organisationId,
    payRunId: run.id,
    attemptNumber: run.xeroPushRetryCount + 1,
  });

  const push = await pushPayRunToXero({
    accessToken: xeroConn?.xeroAccessToken ?? "mock-token",
    tenantId: xeroConn?.xeroTenantId ?? "mock-tenant",
    payload,
  });

  const digest = digestPayload(payload);
  await payrollRepo.insertXeroPushLogAdmin(appDb.admin, {
    payRunId: run.id,
    organisationId,
    attemptNumber: run.xeroPushRetryCount + 1,
    payloadDigest: digest,
    responseStatus: push.ok ? 200 : push.status ?? 502,
    responseBody: push.ok ? { payRunId: push.payRunId } : { message: push.message },
    success: push.ok,
    errorCode: push.ok ? null : push.code,
  });

  if (!push.ok) {
    await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
      status: "xero_push_pending",
      xeroPushRetryCount: run.xeroPushRetryCount + 1,
      xeroPushAttemptedAt: new Date().toISOString(),
    });
    trackPayrollEvent("payroll.xero_push_failed", {
      organisationId,
      payRunId: run.id,
      errorCode: push.code,
    });
    throw new PayrollServiceError(502, push.message, "xero_push_failed");
  }

  await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
    status: "sent_to_xero",
    xeroTenantId: push.tenantId,
    xeroPayRunId: push.payRunId,
    xeroPushAttemptedAt: new Date().toISOString(),
    xeroPushRetryCount: run.xeroPushRetryCount + 1,
  });
  await payrollRepo.linkStagingToPayRunAdmin(
    appDb.admin,
    run.id,
    organisationId,
    run.payPeriodId,
  );

  if (process.env.XERO_PAYROLL_MOCK === "1") {
    await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
      status: "reconciled",
      xeroFinalisedAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      payslipsIssuedAt: new Date().toISOString(),
      stpLodgedAt: new Date().toISOString(),
      superScheduledAt: new Date().toISOString(),
      superPaidAt: new Date().toISOString(),
      reconciledAt: new Date().toISOString(),
    });
    await payrollRepo.lockTimesheetsForPayRunAdmin(appDb.admin, run.id, run.payPeriodId);
    await appDb.admin
      .update(payPeriods)
      .set({
        status: "exported",
        payrollExportId: run.id,
        exportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(payPeriods.id, run.payPeriodId));
    trackPayrollEvent("payroll.reconciled", { organisationId, payRunId: run.id });
  }
}

const XERO_WEBHOOK_STATUS_MAP: Record<string, PayRunStatus> = {
  PAYRUN_FINALISED: "finalised_in_xero",
  PAYRUN_PAID: "paid",
  PAYSLIPS_ISSUED: "payslips_issued",
  STP_LODGED: "stp_lodged",
  SUPER_SCHEDULED: "super_scheduled",
  SUPER_PAID: "super_paid",
};

function webhookPatchForStatus(status: PayRunStatus): Partial<typeof payRuns.$inferInsert> {
  const now = new Date().toISOString();
  switch (status) {
    case "finalised_in_xero":
      return { xeroFinalisedAt: now };
    case "paid":
      return { paidAt: now };
    case "payslips_issued":
      return { payslipsIssuedAt: now };
    case "stp_lodged":
      return { stpLodgedAt: now };
    case "super_scheduled":
      return { superScheduledAt: now };
    case "super_paid":
      return { superPaidAt: now };
    case "reconciled":
      return { reconciledAt: now };
    default:
      return {};
  }
}

async function resolveOrganisation(
  ctx: RequestAuthContext,
  organisationSlug: string,
): Promise<string> {
  const organisationId = resolveOrganisationIdBySlug(ctx.tenantRoles, organisationSlug);
  if (!organisationId) {
    throw new PayrollServiceError(404, "Organisation not found", "internal_error");
  }
  if (!canPreparePayrollRun(ctx.tenantRoles, organisationId)) {
    throw new PayrollServiceError(403, "Forbidden", "forbidden");
  }
  return organisationId;
}

function toLineDto(
  row: Awaited<ReturnType<typeof payrollRepo.listLineItems>>[number],
  staffName: string,
  includeFdv: boolean,
): PayRunLineItemDto {
  const dto: PayRunLineItemDto = {
    id: row.id,
    userProfileId: row.userProfileId,
    staffName,
    hoursTotal: Number(row.hoursTotal),
    grossCents: row.grossCents,
    superCents: row.superCents,
    paygCents: row.paygCents,
    netCents: row.netCents,
    hasOverrides: row.hasOverrides,
    hasFdvLeave: row.hasFdvLeave,
    fdvPayslipLabel: row.fdvPayslipLabel,
    hoursBreakdown: (row.hoursBreakdown as Record<string, unknown>) ?? {},
    isTermination: row.isTermination,
  };
  return stripFdvFromLineItemDto(dto, includeFdv);
}

async function buildRunSummary(
  ctx: RequestAuthContext,
  organisationId: string,
  run: NonNullable<Awaited<ReturnType<typeof payrollRepo.getPayRunById>>>,
): Promise<PayRunSummaryDto> {
  const includeFdv = viewerCanSeeFdv(ctx.tenantRoles, organisationId);
  const lines = await ctx.appDb.rls((tx) => payrollRepo.listLineItems(tx, run.id));
  const names = await ctx.appDb.rls((tx) =>
    payrollRepo.getStaffNames(
      tx,
      lines.map((l) => l.userProfileId),
    ),
  );

  return {
    id: run.id,
    payPeriodId: run.payPeriodId,
    status: run.status as PayRunStatus,
    periodStart: run.periodStart,
    periodEnd: run.periodEnd,
    payDate: run.payDate,
    totalGrossCents: run.totalGrossCents,
    totalSuperCents: run.totalSuperCents,
    totalPaygCents: run.totalPaygCents,
    totalNetCents: run.totalNetCents,
    employeeCount: run.employeeCount,
    ownerReturnNotes: run.ownerReturnNotes,
    lineItems: lines.map((l) => toLineDto(l, names.get(l.userProfileId) ?? "Employee", includeFdv)),
    lastPreflight: null,
  };
}

export const payrollService = {
  async getPageData(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; venueSlug: string },
  ): Promise<PayrollPagePayload> {
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);

    const venueContext = await ctx.appDb.rls((tx) =>
      scopeRepo.getVenueContextBySlugs(tx, args.organisationSlug, args.venueSlug),
    );

    const settings = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayrollSettings(tx, organisationId),
    );
    const xeroVenueId = settings?.primaryXeroVenueId ?? venueContext?.venueId ?? null;
    const xeroConn = await ctx.appDb.rls((tx) =>
      payrollRepo.getXeroConnectionForOrg(tx, organisationId, xeroVenueId),
    );

    const periodRows = await ctx.appDb.rls((tx) =>
      payrollRepo.listPayPeriodsWithRuns(tx, organisationId),
    );

    const periods: PayrollPeriodDto[] = await Promise.all(
      periodRows.map(async ({ period, run }) => {
        const count = await ctx.appDb.rls((tx) =>
          payrollRepo.countApprovedStagingLines(tx, organisationId, period.id),
        );
        return {
          payPeriodId: period.id,
          startDate: period.startDate,
          endDate: period.endDate,
          status: period.status,
          payRunId: run?.id ?? null,
          payRunStatus: (run?.status as PayRunStatus | undefined) ?? null,
          approvedTimesheetCount: count,
          label: formatPeriodLabel(period.startDate, period.endDate),
        };
      }),
    );

    const activePeriod = periods.find((p) => p.payRunId) ?? periods.find((p) => p.status !== "open");
    let activePayRun: PayRunSummaryDto | null = null;
    if (activePeriod?.payRunId) {
      const run = await ctx.appDb.rls((tx) =>
        payrollRepo.getPayRunById(tx, activePeriod.payRunId!, organisationId),
      );
      if (run) {
        activePayRun = await buildRunSummary(ctx, organisationId, run);
      }
    }

    trackPayrollEvent("payroll.viewed", { organisationId, payPeriodId: activePeriod?.payPeriodId });

    return {
      canPrepare: canPreparePayrollRun(ctx.tenantRoles, organisationId),
      canApprove: canApprovePayrollRun(ctx.tenantRoles, organisationId),
      canExecute: canExecutePayrollPayment(ctx.tenantRoles, organisationId),
      xeroConnected: Boolean(xeroConn?.xeroTenantId),
      periods,
      activePayRun,
    };
  },

  async prepareRun(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payPeriodId: string },
  ) {
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);

    const period = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayPeriod(tx, args.payPeriodId, organisationId),
    );
    if (!period) {
      throw new PayrollServiceError(404, "Pay period not found", "pay_period_not_found");
    }

    const stagingCount = await ctx.appDb.rls((tx) =>
      payrollRepo.countApprovedStagingLines(tx, organisationId, period.id),
    );
    if (stagingCount === 0) {
      throw new PayrollServiceError(
        422,
        "No approved timesheets for this period yet.",
        "no_approved_timesheets",
      );
    }

    const existing = await ctx.appDb.rls((tx) =>
      payrollRepo.getPrimaryRunForPeriod(tx, organisationId, period.id),
    );
    if (existing && existing.status !== "draft" && existing.status !== "returned_for_revision") {
      return buildRunSummary(ctx, organisationId, existing);
    }

    const settings = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayrollSettings(tx, organisationId),
    );
    const payDate = addDays(period.endDate, settings?.defaultPaydayOffsetDays ?? 3);

    const run =
      existing ??
      (await ctx.appDb.rls((tx) =>
        payrollRepo.insertPayRun(tx, {
          organisationId,
          payPeriodId: period.id,
          frequency: period.frequency,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          payDate,
          status: "draft",
          preparedBy: ctx.userId,
          preparedAt: new Date().toISOString(),
        }),
      ));

    trackPayrollEvent("payroll.prepared", { organisationId, payRunId: run.id, payPeriodId: period.id });
    return buildRunSummary(ctx, organisationId, run);
  },

  async runPreflightCheck(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string },
  ) {
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);
    const run = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, args.payRunId, organisationId),
    );
    if (!run) throw new PayrollServiceError(404, "Pay run not found", "pay_run_not_found");

    const staging = await ctx.appDb.rls((tx) =>
      payrollRepo.listTimesheetStagingLines(tx, organisationId, run.payPeriodId),
    );
    const userIds = [...new Set(staging.map((s) => s.userProfileId))];
    const profileRows = await ctx.appDb.rls((tx) =>
      payrollRepo.listPayrollProfiles(tx, organisationId, userIds),
    );
    const profiles: EmployeePayrollProfile[] = profileRows.map((r) => payrollRepo.toProfileRow(r));
    const names = await ctx.appDb.rls((tx) => payrollRepo.getStaffNames(tx, userIds));

    const result = runPreflight({ profiles, staffNames: names });
    await ctx.appDb.rls((tx) =>
      payrollRepo.insertPreflightCheck(tx, {
        payRunId: run.id,
        organisationId,
        checkedBy: ctx.userId,
        results: result,
        hardBlockCount: result.hardBlockCount,
        softWarningCount: result.softWarningCount,
        passed: result.passed,
      }),
    );

    if (!result.passed) {
      trackPayrollEvent("payroll.preflight_blocked", {
        organisationId,
        payRunId: run.id,
        hardBlockCount: result.hardBlockCount,
      });
      throw new PayrollServiceError(422, "Pre-flight check failed", "preflight_hard_block");
    }

    return result;
  },

  async calculateRun(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string },
  ) {
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);
    const run = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, args.payRunId, organisationId),
    );
    if (!run) throw new PayrollServiceError(404, "Pay run not found", "pay_run_not_found");
    if (!canEditLineItem(run.status as PayRunStatus)) {
      throw new PayrollServiceError(409, "Pay run cannot be edited", "pay_run_locked");
    }

    const settings = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayrollSettings(tx, organisationId),
    );
    const superRate = Number(settings?.superRatePct ?? 12);

    const tsLines = await ctx.appDb.rls((tx) =>
      payrollRepo.listTimesheetStagingLines(tx, organisationId, run.payPeriodId),
    );
    const leaveRows = await ctx.appDb.rls((tx) =>
      payrollRepo.listLeaveStagingLines(tx, organisationId, run.periodStart, run.periodEnd),
    );

    const timesheetPayrollLines: TimesheetPayrollLine[] = tsLines.map((l) => ({
      userProfileId: l.userProfileId,
      hours: Number(l.hours),
      baseRateCents: l.baseRateCents,
      grossCents: payrollRepo.stagingLineGross(l),
    }));

    const leavePayrollLines: LeavePayrollLine[] = leaveRows.map(({ line, leaveTypeCode }) => ({
      userProfileId: line.userProfileId,
      hours: Number(line.hours),
      rateCents: line.rateCents,
      isFdv: leaveTypeCode === "domestic_violence" || leaveTypeCode === "fdv",
      leaveTypeCode,
    }));

    const userIds = [
      ...new Set([
        ...timesheetPayrollLines.map((l) => l.userProfileId),
        ...leavePayrollLines.map((l) => l.userProfileId),
      ]),
    ];
    const profileRows = await ctx.appDb.rls((tx) =>
      payrollRepo.listPayrollProfiles(tx, organisationId, userIds),
    );
    const profileMap = new Map(
      profileRows.map((r) => [r.userProfileId, payrollRepo.toProfileRow(r)]),
    );

    const calculated = aggregateEmployeeLines(
      timesheetPayrollLines,
      leavePayrollLines,
      profileMap,
      superRate,
    );

    const snapshot = { timesheetPayrollLines, leavePayrollLines, calculated, at: new Date().toISOString() };

    await ctx.appDb.rls(async (tx) => {
      await payrollRepo.replaceLineItems(
        tx,
        run.id,
        organisationId,
        calculated.map((c) => {
          const profile = profileMap.get(c.userProfileId);
          return {
            payRunId: run.id,
            organisationId,
            userProfileId: c.userProfileId,
            hoursTotal: String(c.hoursTotal),
            hoursBreakdown: c.hoursBreakdown,
            grossCents: c.grossCents,
            superCents: c.superCents,
            paygCents: c.paygCents,
            netCents: c.netCents,
            payRateSnapshotCents: c.payRateSnapshotCents,
            awardClassificationSnapshot: profile?.awardClassification ?? null,
            taxTreatmentCodeSnapshot: profile?.taxTreatmentCode ?? null,
            stp2IncomeTypeSnapshot: profile?.stp2IncomeType ?? null,
            hasFdvLeave: c.hasFdvLeave,
            fdvPayslipLabel: c.fdvPayslipLabel,
          };
        }),
      );

      const totals = calculated.reduce(
        (acc, c) => ({
          gross: acc.gross + c.grossCents,
          super: acc.super + c.superCents,
          payg: acc.payg + c.paygCents,
          net: acc.net + c.netCents,
        }),
        { gross: 0, super: 0, payg: 0, net: 0 },
      );

      await payrollRepo.updatePayRun(tx, run.id, {
        calculationSnapshot: snapshot,
        totalGrossCents: totals.gross,
        totalSuperCents: totals.super,
        totalPaygCents: totals.payg,
        totalNetCents: totals.net,
        employeeCount: calculated.length,
      });
    });

    trackPayrollEvent("payroll.calculated", {
      organisationId,
      payRunId: run.id,
      employeeCount: calculated.length,
      totalGrossCents: calculated.reduce((s, c) => s + c.grossCents, 0),
    });

    const updated = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, run.id, organisationId),
    );
    return buildRunSummary(ctx, organisationId, updated!);
  },

  async submitForApproval(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string },
  ) {
    return payrollService.transitionRun(ctx, {
      ...args,
      to: "pending_owner_approval",
      event: "payroll.submitted_for_approval",
    });
  },

  async returnToManager(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string; notes: string },
  ) {
    try {
      assertCanApprovePayroll(ctx.tenantRoles, resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug)!);
    } catch (e) {
      mapAuthError(e);
    }
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);
    const run = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, args.payRunId, organisationId),
    );
    if (!run) throw new PayrollServiceError(404, "Pay run not found", "pay_run_not_found");
    if (!canTransitionPayRunStatus(run.status as PayRunStatus, "returned_for_revision")) {
      throw new PayrollServiceError(409, "Invalid status transition", "invalid_status_transition");
    }
    if (!args.notes.trim()) {
      throw new PayrollServiceError(400, "Notes are required", "reason_required");
    }

    await ctx.appDb.rls((tx) =>
      payrollRepo.updatePayRun(tx, run.id, {
        status: "returned_for_revision",
        ownerReturnNotes: args.notes.trim(),
        returnedAt: new Date().toISOString(),
        returnedBy: ctx.userId,
      }),
    );
    trackPayrollEvent("payroll.returned_by_owner", { organisationId, payRunId: run.id });
    const updated = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, run.id, organisationId),
    );
    return buildRunSummary(ctx, organisationId, updated!);
  },

  async approveRun(ctx: RequestAuthContext, args: { organisationSlug: string; payRunId: string }) {
    try {
      assertCanApprovePayroll(
        ctx.tenantRoles,
        resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug)!,
      );
    } catch (e) {
      mapAuthError(e);
    }
    return payrollService.transitionRun(ctx, {
      ...args,
      to: "approved",
      event: "payroll.approved",
      patch: { approvedBy: ctx.userId, approvedAt: new Date().toISOString() },
    });
  },

  async executePayRun(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string; venueSlug: string },
  ) {
    try {
      assertCanExecutePayroll(
        ctx.tenantRoles,
        resolveOrganisationIdBySlug(ctx.tenantRoles, args.organisationSlug)!,
      );
    } catch (e) {
      mapAuthError(e);
    }

    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);
    const run = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, args.payRunId, organisationId),
    );
    if (!run) throw new PayrollServiceError(404, "Pay run not found", "pay_run_not_found");
    if (run.status !== "approved" && run.status !== "xero_push_pending") {
      throw new PayrollServiceError(409, "Pay run is not ready to pay", "invalid_status_transition");
    }

    const settings = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayrollSettings(tx, organisationId),
    );
    const venueContext = await ctx.appDb.rls((tx) =>
      scopeRepo.getVenueContextBySlugs(tx, args.organisationSlug, args.venueSlug),
    );
    const xeroVenueId = settings?.primaryXeroVenueId ?? venueContext?.venueId ?? null;

    try {
      await performXeroPayRunPushAdmin(ctx.appDb, run, organisationId, xeroVenueId);
    } catch (error) {
      if (error instanceof PayrollServiceError) throw error;
      throw error;
    }

    const updated = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, run.id, organisationId),
    );
    return buildRunSummary(ctx, organisationId, updated!);
  },

  async retryXeroPush(
    ctx: RequestAuthContext,
    args: { organisationSlug: string; payRunId: string; venueSlug: string },
  ) {
    return payrollService.executePayRun(ctx, args);
  },

  async retryPendingXeroPushes(appDb: PayrollAdminDb) {
    const runs = await payrollRepo.listPayRunsByStatusAdmin(appDb.admin, "xero_push_pending");
    let retried = 0;
    let errors = 0;

    for (const run of runs) {
      try {
        const settings = await payrollRepo.getPayrollSettingsAdmin(appDb.admin, run.organisationId);
        const xeroVenueId = settings?.primaryXeroVenueId ?? null;
        await performXeroPayRunPushAdmin(appDb, run, run.organisationId, xeroVenueId);
        retried += 1;
      } catch (error) {
        console.error("[payroll-xero-retry]", run.id, error);
        errors += 1;
      }
    }

    return { retried, errors, total: runs.length };
  },

  async markStaleWebhookPayRuns(appDb: PayrollAdminDb, staleHours = 4) {
    const runs = await payrollRepo.listStaleSentToXeroAdmin(appDb.admin, staleHours);
    let marked = 0;

    for (const run of runs) {
      await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
        status: "xero_push_pending",
      });
      marked += 1;
    }

    return { marked, total: runs.length };
  },

  async applyXeroWebhookEvent(
    appDb: PayrollAdminDb,
    args: { xeroPayRunId: string; eventType: string },
  ) {
    const run = await payrollRepo.getPayRunByXeroIdAdmin(appDb.admin, args.xeroPayRunId);
    if (!run) {
      return { ok: false as const, reason: "pay_run_not_found" };
    }

    const nextStatus = XERO_WEBHOOK_STATUS_MAP[args.eventType.toUpperCase()];
    if (!nextStatus) {
      return { ok: false as const, reason: "unknown_event_type" };
    }

    if (!canTransitionPayRunStatus(run.status as PayRunStatus, nextStatus)) {
      return { ok: false as const, reason: "invalid_status_transition" };
    }

    await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
      status: nextStatus,
      ...webhookPatchForStatus(nextStatus),
    });

    if (nextStatus === "super_paid") {
      await payrollRepo.updatePayRunAdmin(appDb.admin, run.id, {
        status: "reconciled",
        ...webhookPatchForStatus("reconciled"),
      });
      await payrollRepo.lockTimesheetsForPayRunAdmin(appDb.admin, run.id, run.payPeriodId);
      await appDb.admin
        .update(payPeriods)
        .set({
          status: "exported",
          payrollExportId: run.id,
          exportedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(payPeriods.id, run.payPeriodId));
      trackPayrollEvent("payroll.reconciled", {
        organisationId: run.organisationId,
        payRunId: run.id,
      });
    }

    trackPayrollEvent("payroll.xero_webhook_received", {
      organisationId: run.organisationId,
      payRunId: run.id,
      eventType: args.eventType,
    });

    return { ok: true as const, payRunId: run.id, status: nextStatus };
  },

  async transitionRun(
    ctx: RequestAuthContext,
    args: {
      organisationSlug: string;
      payRunId: string;
      to: PayRunStatus;
      event: Parameters<typeof trackPayrollEvent>[0];
      patch?: Record<string, unknown>;
    },
  ) {
    const organisationId = await resolveOrganisation(ctx, args.organisationSlug);
    const run = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, args.payRunId, organisationId),
    );
    if (!run) throw new PayrollServiceError(404, "Pay run not found", "pay_run_not_found");
    if (!canTransitionPayRunStatus(run.status as PayRunStatus, args.to)) {
      throw new PayrollServiceError(409, "Invalid status transition", "invalid_status_transition");
    }

    await ctx.appDb.rls((tx) =>
      payrollRepo.updatePayRun(tx, run.id, {
        status: args.to,
        ...(args.patch ?? {}),
        ...(args.to === "pending_owner_approval"
          ? { submittedForApprovalAt: new Date().toISOString() }
          : {}),
      }),
    );

    trackPayrollEvent(args.event, { organisationId, payRunId: run.id });
    const updated = await ctx.appDb.rls((tx) =>
      payrollRepo.getPayRunById(tx, run.id, organisationId),
    );
    return buildRunSummary(ctx, organisationId, updated!);
  },
};
