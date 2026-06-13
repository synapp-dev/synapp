import type { RlsTx } from "@/server/db/drizzle";
import { leaveRepo } from "@/server/workforce/leave.repo";
import { fallbackHourlyRateCents } from "@/server/workforce/roster-cost.service";

export async function postTimesheetAccrual(
  tx: RlsTx,
  args: {
    organisationId: string;
    userProfileId: string;
    timesheetId: string;
    paidHoursWorked: number;
  },
): Promise<void> {
  if (args.paidHoursWorked <= 0) return;

  const exists = await leaveRepo.accrualEventExists(tx, {
    organisationId: args.organisationId,
    sourceRef: args.timesheetId,
    triggeredBy: "timesheet_approval",
  });
  if (exists) return;

  const employment = await leaveRepo.getEmploymentType(tx, args.organisationId, args.userProfileId);
  if (!employment || employment.employmentType === "casual") return;

  const types = await leaveRepo.listLeaveTypes(tx, args.organisationId);
  const accruable = types.filter(
    (t) => t.isAccruable && t.accrualBasis === "hours_worked" && t.accrualRatePct,
  );

  for (const leaveType of accruable) {
    const ratePct = Number(leaveType.accrualRatePct);
    if (!Number.isFinite(ratePct) || ratePct <= 0) continue;

    const hoursChange = Math.round(((args.paidHoursWorked * ratePct) / 100) * 100) / 100;
    if (hoursChange <= 0) continue;

    const balanceId = await leaveRepo.ensureBalanceRow(tx, {
      organisationId: args.organisationId,
      userProfileId: args.userProfileId,
      leaveTypeId: leaveType.id,
    });

    await leaveRepo.adjustBalanceHours(tx, {
      balanceId,
      currentDelta: hoursChange,
      accruedDelta: hoursChange,
    });

    await leaveRepo.insertAccrualEvent(tx, {
      organisationId: args.organisationId,
      userProfileId: args.userProfileId,
      leaveTypeId: leaveType.id,
      triggeredBy: "timesheet_approval",
      hoursChange: String(hoursChange),
      sourceRef: args.timesheetId,
    });
  }
}

export async function createPayrollLeaveLineForRequest(
  tx: RlsTx,
  args: {
    organisationId: string;
    userProfileId: string;
    leaveRequestId: string;
    leaveTypeId: string;
    paidHours: number;
    startDate: string;
    endDate: string;
  },
): Promise<void> {
  if (args.paidHours <= 0) return;

  await leaveRepo.insertPayrollLeaveLine(tx, {
    organisationId: args.organisationId,
    userProfileId: args.userProfileId,
    leaveRequestId: args.leaveRequestId,
    leaveTypeId: args.leaveTypeId,
    payPeriodStart: args.startDate,
    payPeriodEnd: args.endDate,
    hours: String(args.paidHours),
    rateCents: fallbackHourlyRateCents(args.userProfileId),
    isTerminationPayout: false,
  });
}
