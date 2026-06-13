import { resolveMinimumRateFromPack } from "@/server/workforce/award/award-calculation.service";
import { getBuiltinRulePack } from "@/server/workforce/award/award-seed-packs";
import type { EmploymentTypeScope } from "@/server/workforce/award/award-types";

export type TimesheetPayrollLine = {
  userProfileId: string;
  hours: number;
  baseRateCents: number;
  grossCents: number;
  overtimeHours?: number;
  overtimeRateCents?: number | null;
};

export type LeavePayrollLine = {
  userProfileId: string;
  hours: number;
  rateCents: number;
  isFdv: boolean;
  leaveTypeCode?: string;
};

export type EmployeePayrollProfile = {
  userProfileId: string;
  payRateCents: number | null;
  awardCode: string | null;
  awardClassification: string | null;
  awardGrade: string | null;
  dateOfBirth: string | null;
  taxTreatmentCode: string | null;
  tfn: string | null;
  superFundUsi: string | null;
  superMemberNumber: string | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  stp2IncomeType: string | null;
  fdvPayslipLabel: string | null;
};

export type CalculatedLineItem = {
  userProfileId: string;
  hoursTotal: number;
  hoursBreakdown: Record<string, unknown>;
  grossCents: number;
  superCents: number;
  paygCents: number;
  netCents: number;
  payRateSnapshotCents: number | null;
  hasFdvLeave: boolean;
  fdvPayslipLabel: string | null;
};

export const AWARD_MINIMUM_RATE_CENTS: Record<string, number> = {
  "MA000119:1": 2310,
  "MA000119:2": 2520,
  "MA000119:3": 2730,
  "MA000009:1": 2280,
  "MA000009:2": 2490,
};

export function awardMinimumKey(awardCode: string | null, grade: string | null): string | null {
  if (!awardCode || !grade) return null;
  return `${awardCode}:${grade}`;
}

export function getAwardMinimumCents(
  awardCode: string | null,
  grade: string | null,
  employmentType: EmploymentTypeScope = "full_time",
  asOfDate = "2025-07-01",
): number | null {
  if (!awardCode || !grade) return null;
  const pack = getBuiltinRulePack(awardCode);
  if (!pack) return AWARD_MINIMUM_RATE_CENTS[`${awardCode}:${grade}`] ?? null;
  try {
    return resolveMinimumRateFromPack(pack, {
      awardCode,
      classificationGrade: grade,
      employmentType,
      asOfDate,
    });
  } catch {
    return AWARD_MINIMUM_RATE_CENTS[`${awardCode}:${grade}`] ?? null;
  }
}

export function computeBaseWages(lines: TimesheetPayrollLine[]): number {
  return lines.reduce((sum, line) => sum + line.grossCents, 0);
}

export function juniorRateMultiplier(age: number | null): number {
  if (age == null || age >= 21) return 1;
  if (age >= 20) return 0.95;
  if (age >= 19) return 0.9;
  if (age >= 18) return 0.85;
  if (age >= 17) return 0.6;
  return 0.5;
}

export function ageFromDob(dob: string | null, asOf: Date = new Date()): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  let age = asOf.getFullYear() - born.getFullYear();
  const m = asOf.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < born.getDate())) age -= 1;
  return age;
}

export function computeSuperCents(grossCents: number, superRatePct = 12): number {
  return Math.round(grossCents * (superRatePct / 100));
}

export function computePaygCents(args: {
  grossCents: number;
  taxTreatmentCode: string | null;
  tfn: string | null;
}): number {
  if (!args.tfn?.trim()) {
    return Math.round(args.grossCents * 0.47);
  }
  if (!args.taxTreatmentCode?.trim()) {
    return Math.round(args.grossCents * 0.32);
  }
  return Math.round(args.grossCents * 0.2);
}

export function aggregateEmployeeLines(
  timesheetLines: TimesheetPayrollLine[],
  leaveLines: LeavePayrollLine[],
  profiles: Map<string, EmployeePayrollProfile>,
  superRatePct = 12,
): CalculatedLineItem[] {
  const byUser = new Map<string, { timesheets: TimesheetPayrollLine[]; leave: LeavePayrollLine[] }>();

  for (const line of timesheetLines) {
    const bucket = byUser.get(line.userProfileId) ?? { timesheets: [], leave: [] };
    bucket.timesheets.push(line);
    byUser.set(line.userProfileId, bucket);
  }
  for (const line of leaveLines) {
    const bucket = byUser.get(line.userProfileId) ?? { timesheets: [], leave: [] };
    bucket.leave.push(line);
    byUser.set(line.userProfileId, bucket);
  }

  const results: CalculatedLineItem[] = [];

  for (const [userProfileId, bucket] of byUser) {
    const profile = profiles.get(userProfileId);
    const timesheetGross = computeBaseWages(bucket.timesheets);
    const leaveGross = bucket.leave.reduce(
      (sum, l) => sum + Math.round(l.hours * l.rateCents),
      0,
    );
    const hoursFromTimesheets = bucket.timesheets.reduce((s, l) => s + l.hours, 0);
    const hoursFromLeave = bucket.leave.reduce((s, l) => s + l.hours, 0);
    const hasFdvLeave = bucket.leave.some((l) => l.isFdv);
    const grossCents = timesheetGross + leaveGross;
    const superCents = computeSuperCents(grossCents, superRatePct);
    const paygCents = computePaygCents({
      grossCents,
      taxTreatmentCode: profile?.taxTreatmentCode ?? null,
      tfn: profile?.tfn ?? null,
    });
    const netCents = grossCents - paygCents;

    const primaryRate =
      bucket.timesheets[0]?.baseRateCents ?? profile?.payRateCents ?? null;

    results.push({
      userProfileId,
      hoursTotal: hoursFromTimesheets + hoursFromLeave,
      hoursBreakdown: {
        timesheetHours: hoursFromTimesheets,
        leaveHours: hoursFromLeave,
        timesheetLines: bucket.timesheets.length,
        leaveLines: bucket.leave.length,
      },
      grossCents,
      superCents,
      paygCents,
      netCents,
      payRateSnapshotCents: primaryRate,
      hasFdvLeave,
      fdvPayslipLabel: hasFdvLeave ? (profile?.fdvPayslipLabel ?? "other_paid_leave") : null,
    });
  }

  return results;
}
