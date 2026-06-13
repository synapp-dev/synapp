const HOURS_PER_DAY = 7.6;

export type LeaveTypeCode =
  | "annual"
  | "personal"
  | "long_service"
  | "public_holiday"
  | "compassionate"
  | "parental"
  | "unpaid"
  | "dfv"
  | "community_service";

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export function addDaysIso(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function countCalendarDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** Full-day hours unless half-day times supplied (MVP-light). */
export function computeLeaveHours(args: {
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  hoursPerDay?: number;
}): number {
  const hoursPerDay = args.hoursPerDay ?? HOURS_PER_DAY;
  const days = countCalendarDays(args.startDate, args.endDate);

  if (days === 1 && args.startTime && args.endTime) {
    const startM = timeToMinutes(args.startTime);
    const endM = timeToMinutes(args.endTime);
    if (endM > startM) {
      return Math.round(((endM - startM) / 60) * 100) / 100;
    }
  }

  return Math.round(days * hoursPerDay * 100) / 100;
}

function timeToMinutes(t: string): number {
  const parts = t.split(":").map((x) => Number(x.trim()));
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
}

export function requiresOwnerApproval(args: {
  startDate: string;
  endDate: string;
  leaveTypeDefaultRole: "manager" | "owner";
  orgMinDaysForOwner: number;
}): boolean {
  if (args.leaveTypeDefaultRole === "owner") return true;
  const days = countCalendarDays(args.startDate, args.endDate);
  return days > args.orgMinDaysForOwner;
}

export function lslBalanceHours(args: {
  yearsOfService: number;
  stateAccrualWeeksPerYear: number;
  minYears: number;
}): number {
  if (args.yearsOfService < args.minYears) return 0;
  const weeks = args.yearsOfService * args.stateAccrualWeeksPerYear;
  return Math.round(weeks * 5 * HOURS_PER_DAY * 100) / 100;
}

export function yearsBetween(startDateIso: string, asOfIso: string): number {
  const start = new Date(`${startDateIso}T12:00:00`);
  const asOf = new Date(`${asOfIso}T12:00:00`);
  const ms = asOf.getTime() - start.getTime();
  return Math.max(0, ms / (365.25 * 86400000));
}

export function dateInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function maskCalendarLabel(isPrivate: boolean, leaveTypeName: string): string {
  return isPrivate ? "Leave (private)" : leaveTypeName;
}

export function canViewLeaveReason(args: {
  viewerId: string;
  subjectId: string;
  isPrivate: boolean;
  isOwner: boolean;
  isDecidingManager: boolean;
}): boolean {
  if (!args.isPrivate) return true;
  if (args.viewerId === args.subjectId) return true;
  if (args.isOwner) return true;
  if (args.isDecidingManager) return true;
  return false;
}

export function casualCannotAccrue(code: LeaveTypeCode): boolean {
  return code === "annual" || code === "personal" || code === "long_service";
}

export function formatHoursAndDays(hours: number): { hours: number; days: number } {
  return {
    hours: Math.round(hours * 100) / 100,
    days: Math.round((hours / HOURS_PER_DAY) * 100) / 100,
  };
}
