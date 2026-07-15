export type TimesheetStatus = "open" | "submitted" | "approved" | "disputed" | "locked";
export type VarianceTier = "green" | "amber" | "red" | "black";

export function computeHoursFromTimestamps(
  startsAt: string,
  endsAt: string,
  breakMinutes = 0,
): number {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (end <= start) return 0;
  const raw = (end - start) / 3_600_000;
  const breaks = breakMinutes / 60;
  return Math.round(Math.max(0, raw - breaks) * 100) / 100;
}

export function computeRosteredHours(
  startsAt: string,
  endsAt: string,
  breakMinutes: number,
): number {
  return computeHoursFromTimestamps(startsAt, endsAt, breakMinutes);
}

export function computeVarianceMinutes(actualIso: string | null, rosteredIso: string): number | null {
  if (!actualIso) return null;
  const diff = (new Date(actualIso).getTime() - new Date(rosteredIso).getTime()) / 60_000;
  return Math.round(diff);
}

export function classifyVarianceTier(args: {
  startVarianceMin: number | null;
  endVarianceMin: number | null;
  hoursVariance: number | null;
  hasClockData: boolean;
  toleranceMin: number;
}): VarianceTier {
  if (!args.hasClockData) return "black";
  const startAbs = Math.abs(args.startVarianceMin ?? 0);
  const endAbs = Math.abs(args.endVarianceMin ?? 0);
  const hoursAbs = Math.abs((args.hoursVariance ?? 0) * 60);
  const maxMin = Math.max(startAbs, endAbs, hoursAbs);
  if (maxMin <= args.toleranceMin) return "green";
  if (maxMin <= 15) return "amber";
  return "red";
}

export function requiresOwnerApprovalForVariance(
  startVarianceMin: number | null,
  endVarianceMin: number | null,
  hoursVariance: number | null,
  orgThresholdMin: number,
): boolean {
  const startAbs = Math.abs(startVarianceMin ?? 0);
  const endAbs = Math.abs(endVarianceMin ?? 0);
  const hoursAbs = Math.abs((hoursVariance ?? 0) * 60);
  return Math.max(startAbs, endAbs, hoursAbs) > orgThresholdMin;
}

export function roundDisplayTime(iso: string, roundingMinutes: number): string {
  if (roundingMinutes <= 0) return iso;
  const d = new Date(iso);
  const ms = roundingMinutes * 60_000;
  const rounded = new Date(Math.round(d.getTime() / ms) * ms);
  return rounded.toISOString();
}

export function applyAutoDeductBreak(args: {
  grossHours: number;
  breakMode: "explicit_events" | "auto_deduct";
  explicitBreakMinutes: number;
  autoDeductAfterHours: number;
  autoDeductBreakMin: number;
}): { paidHours: number; breakMinutes: number } {
  if (args.breakMode === "explicit_events") {
    return {
      paidHours: Math.round(Math.max(0, args.grossHours - args.explicitBreakMinutes / 60) * 100) / 100,
      breakMinutes: args.explicitBreakMinutes,
    };
  }
  if (args.grossHours > args.autoDeductAfterHours) {
    const breakMinutes = args.autoDeductBreakMin;
    return {
      paidHours: Math.round(Math.max(0, args.grossHours - breakMinutes / 60) * 100) / 100,
      breakMinutes,
    };
  }
  return { paidHours: args.grossHours, breakMinutes: 0 };
}

export function computeWeeklyOtHours(weeklyHours: number, threshold = 38): number {
  if (weeklyHours <= threshold) return 0;
  return Math.round((weeklyHours - threshold) * 100) / 100;
}

export function haversineDistanceM(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function validateGeolocation(args: {
  staffLat: number | null | undefined;
  staffLng: number | null | undefined;
  venueLat: number | null | undefined;
  venueLng: number | null | undefined;
  radiusM: number;
}): { ok: boolean; flagged: boolean } {
  if (args.staffLat == null || args.staffLng == null || args.venueLat == null || args.venueLng == null) {
    return { ok: true, flagged: false };
  }
  const venueLat = Number(args.venueLat);
  const venueLng = Number(args.venueLng);
  const dist = haversineDistanceM(args.staffLat, args.staffLng, venueLat, venueLng);
  return { ok: true, flagged: dist > args.radiusM };
}

export function canEditTimesheet(status: TimesheetStatus, isOperator: boolean): boolean {
  if (status === "locked") return false;
  if (status === "open") return true;
  if (status === "submitted" || status === "disputed") return isOperator;
  if (status === "approved") return isOperator;
  return false;
}

export function toIsoDateInTz(date: Date, timezone: string): string {
  void timezone;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type PayPeriodFrequency = "weekly" | "fortnightly" | "monthly";

export function payPeriodBoundsForDate(args: {
  date: string;
  frequency: PayPeriodFrequency;
  startDow: number;
}): { startDate: string; endDate: string } {
  const parts = args.date.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const dt = new Date(y, m - 1, d);

  if (args.frequency === "monthly") {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { startDate: formatIsoDate(start), endDate: formatIsoDate(end) };
  }

  const dow = (dt.getDay() + 6) % 7;
  const periodStart = new Date(dt);
  periodStart.setDate(dt.getDate() - ((dow - args.startDow + 7) % 7));

  const periodEnd = new Date(periodStart);
  if (args.frequency === "weekly") {
    periodEnd.setDate(periodStart.getDate() + 6);
  } else {
    periodEnd.setDate(periodStart.getDate() + 13);
  }

  return { startDate: formatIsoDate(periodStart), endDate: formatIsoDate(periodEnd) };
}

function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function minutesBetween(isoA: string, isoB: string): number {
  return Math.round((new Date(isoB).getTime() - new Date(isoA).getTime()) / 60_000);
}
